package com.omniresto.backend.service;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.MealPeriod;
import com.omniresto.backend.domain.enums.OrderItemStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentStatus;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderEventMessage;
import com.omniresto.backend.model.order.response.OrderItemResponse;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final TableSessionService tableSessionService;

    @Setter
    private Clock clock = Clock.systemDefaultZone();

    public List<OrderResponse> getAllOrders(OrderStatus status) {
        List<OrderEntity> orders;
        if (status != null) {
            orders = orderRepository.findByStatus(status);
        } else {
            orders = orderRepository.findAll();
        }

        return orders.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getAllOrders(String branchId, OrderStatus status) {
        return getAllOrders(status);
    }

    public OrderResponse getOrderById(String id) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        return createOrder(request, null);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request, String sessionToken) {
        // ── 1. Kiểm tra thời gian phục vụ của các món theo buổi ────────────────
        LocalTime now = LocalTime.now(clock);
        MealPeriod currentPeriod = MealPeriod.getCurrentPeriod(now);

        if (currentPeriod == MealPeriod.CLOSED) {
            throw new BadRequestException(
                    "Nhà hàng hiện đang trong giờ đóng cửa (22:00 - 06:00). Quý khách vui lòng đặt món vào ca Sáng từ 06:00!"
            );
        }

        // ── 2. Bảo mật phiên bàn & Khóa phiên bi quan (Pessimistic Lock) ──────────
        String resolvedTableId = null;
        String resolvedTableNo = request.getTableNo();
        TableSessionEntity lockedSession = null;

        if (request.getOrderType() == OrderType.dine_in) {
            String token = (sessionToken != null && !sessionToken.isBlank())
                    ? sessionToken
                    : request.getSessionToken();

            if (token == null || token.isBlank()) {
                throw new BadRequestException(
                        "Đơn dùng tại bàn bắt buộc phải quét mã QR tại bàn để xác thực phiên (thiếu X-Table-Session)!"
                );
            }

            // Khóa dòng phiên bàn (SELECT ... FOR UPDATE) để chống Race Condition khi nhiều máy cùng đặt
            lockedSession = tableSessionService.validateAndTouchSessionWithLock(token);
            resolvedTableId = lockedSession.getTableId();
            resolvedTableNo = lockedSession.getTableNo();
        }

        // ── 3. Kiểm tra xem bàn này đã có Hóa đơn mở (Active Order) chưa? ───────
        if (request.getOrderType() == OrderType.dine_in && lockedSession != null) {
            // Chặn thêm món khi hóa đơn đang đóng băng để thanh toán
            if (lockedSession.getStatus() == TableSessionStatus.PAYMENT_REQUESTED) {
                throw new BadRequestException(
                        "Hóa đơn của " + lockedSession.getTableNo() + " đang được đóng băng để thanh toán. Quý khách vui lòng bấm 'Hủy yêu cầu thanh toán' trên ứng dụng nếu muốn tiếp tục gọi thêm món!"
                );
            }

            List<OrderStatus> activeStatuses = List.of(
                    OrderStatus.pending,
                    OrderStatus.confirmed,
                    OrderStatus.preparing,
                    OrderStatus.ready
            );

            Optional<OrderEntity> activeOrderOpt = orderRepository
                    .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(lockedSession.getId(), activeStatuses);

            if (activeOrderOpt.isPresent()) {
                // ── [CHÍNH SÁCH 3 TẦNG]: CỘNG DỒN ĐỢT GỌI MỚI (ROUND) VÀO HÓA ĐƠN CŨ ──
                OrderEntity existingOrder = activeOrderOpt.get();
                return appendNewRoundToOrder(existingOrder, request, now, currentPeriod, lockedSession);
            }
        }

        // ── 4. Chưa có đơn mở (Đợt 1 / Khởi tạo hóa đơn mới) ───────────────────
        return createFreshOrder(request, lockedSession, resolvedTableId, resolvedTableNo, now, currentPeriod);
    }

    /**
     * Tạo hóa đơn mới cho đợt gọi món đầu tiên (Round 1)
     */
    private OrderResponse createFreshOrder(
            OrderRequest request,
            TableSessionEntity session,
            String tableId,
            String tableNo,
            LocalTime now,
            MealPeriod currentPeriod
    ) {
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<OrderItemEntity> itemEntities = new ArrayList<>();

        String orderId = "ord-" + UUID.randomUUID().toString().substring(0, 8);
        String orderNum = "ORD-" + (System.currentTimeMillis() % 100000);

        // Bảo mật riêng tư: Không ép hoặc để lộ thông tin cá nhân tại bàn
        String customerName = request.getCustomerName();
        if ((customerName == null || customerName.isBlank()) && tableNo != null) {
            customerName = "Bàn " + tableNo;
        }

        boolean isSessionVerified = (session != null && session.isVerified());
        OrderStatus initialOrderStatus = (session != null && !isSessionVerified)
                ? OrderStatus.pending // Đợt 1: Chờ nhân viên xác nhận tại bàn
                : OrderStatus.confirmed; // Đã xác nhận: Vào hàng đợi bếp (confirmed) chờ bắt đầu nấu

        OrderItemStatus initialItemStatus = (session != null && !isSessionVerified)
                ? OrderItemStatus.pending
                : OrderItemStatus.confirmed;

        OrderEntity entity = OrderEntity.builder()
                .orderNumber(orderNum)
                .tableSessionId(session != null ? session.getId() : null)
                .orderType(request.getOrderType())
                .tableId(tableId)
                .tableNo(tableNo)
                .status(initialOrderStatus)
                .paymentStatus(PaymentStatus.unpaid)
                .totalAmount(BigDecimal.ZERO)
                .paymentMethod(request.getPaymentMethod())
                .customerName(customerName)
                .build();
        entity.setId(orderId);

        OrderEntity saved = orderRepository.save(entity);

        if (request.getItems() != null) {
            for (var itemReq : request.getItems()) {
                if (itemReq.getMenuItemId() == null || itemReq.getMenuItemId().isBlank()) {
                    throw new BadRequestException("Mỗi món ăn phải có menuItemId hợp lệ từ hệ thống.");
                }
                var m = menuItemRepository.findById(itemReq.getMenuItemId())
                        .orElseThrow(() -> new BadRequestException("Món ăn không tồn tại trong hệ thống!"));
                validateMealPeriodForDish(m, now, currentPeriod);
                BigDecimal unitPrice = m.getBasePrice() != null ? m.getBasePrice() : BigDecimal.ZERO;
                String itemName = m.getName();

                int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;
                calculatedTotal = calculatedTotal.add(unitPrice.multiply(BigDecimal.valueOf(qty)));

                OrderItemEntity item = OrderItemEntity.builder()
                        .order(saved)
                        .menuItemId(m.getId())
                        .itemName(itemName)
                        .quantity(qty)
                        .unitPrice(unitPrice)
                        .notes(itemReq.getNotes())
                        .roundNo(1) // Đợt 1
                        .status(initialItemStatus)
                        .addedAt(LocalDateTime.now())
                        .build();
                item.setId("item-" + UUID.randomUUID().toString().substring(0, 8));
                itemEntities.add(orderItemRepository.save(item));
            }
        }

        saved.setTotalAmount(calculatedTotal);
        OrderEntity finalSaved = orderRepository.save(saved);

        OrderResponse response = mapToResponseWithItems(finalSaved, itemEntities);
        sendWebSocketEvent("ORDER_CREATED", response);
        return response;
    }

    /**
     * Thêm đợt gọi món mới (Round N) vào Hóa đơn hiện tại của bàn ăn
     */
    private OrderResponse appendNewRoundToOrder(
            OrderEntity order,
            OrderRequest request,
            LocalTime now,
            MealPeriod currentPeriod,
            TableSessionEntity session
    ) {
        List<OrderItemEntity> existingItems = orderItemRepository.findByOrder_Id(order.getId());

        // Tính số thứ tự đợt gọi món mới: max(round_no) + 1
        int nextRoundNo = existingItems.stream()
                .mapToInt(it -> it.getRoundNo() != null ? it.getRoundNo() : 1)
                .max()
                .orElse(1) + 1;

        // Nếu phiên bàn đã được nhân viên duyệt (isVerified = true), các đợt gọi thêm vào hàng đợi bếp (confirmed)
        boolean isSessionVerified = (session != null && session.isVerified());
        OrderItemStatus newRoundItemStatus = isSessionVerified
                ? OrderItemStatus.confirmed // Gửi vào hàng đợi bếp chờ bấm nấu
                : OrderItemStatus.pending;

        List<OrderItemEntity> newRoundItems = new ArrayList<>();

        if (request.getItems() != null) {
            for (var itemReq : request.getItems()) {
                if (itemReq.getMenuItemId() == null || itemReq.getMenuItemId().isBlank()) {
                    throw new BadRequestException("Mỗi món ăn gọi thêm phải có menuItemId hợp lệ từ hệ thống.");
                }
                var m = menuItemRepository.findById(itemReq.getMenuItemId())
                        .orElseThrow(() -> new BadRequestException("Món ăn gọi thêm không tồn tại trong hệ thống!"));
                validateMealPeriodForDish(m, now, currentPeriod);
                BigDecimal unitPrice = m.getBasePrice() != null ? m.getBasePrice() : BigDecimal.ZERO;
                String itemName = m.getName();

                int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

                // Lưu từng dòng món riêng biệt gắn với round_no mới (KHÔNG gộp cứng số lượng)
                OrderItemEntity item = OrderItemEntity.builder()
                        .order(order)
                        .menuItemId(m.getId())
                        .itemName(itemName)
                        .quantity(qty)
                        .unitPrice(unitPrice)
                        .notes(itemReq.getNotes())
                        .roundNo(nextRoundNo) // Đợt N
                        .status(newRoundItemStatus)
                        .addedAt(LocalDateTime.now())
                        .build();
                item.setId("item-" + UUID.randomUUID().toString().substring(0, 8));
                newRoundItems.add(orderItemRepository.save(item));
            }
        }

        // Tính lại tổng tiền chính xác từ tất cả các món không bị hủy
        List<OrderItemEntity> allItems = new ArrayList<>(existingItems);
        allItems.addAll(newRoundItems);

        BigDecimal recalculatedTotal = allItems.stream()
                .filter(it -> it.getStatus() != OrderItemStatus.cancelled)
                .map(it -> it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setTotalAmount(recalculatedTotal);

        // Nếu đơn trước đó đã thanh toán (paid), việc thêm món mới biến trạng thái thanh toán thành partial
        if (order.getPaymentStatus() == PaymentStatus.paid) {
            order.setPaymentStatus(PaymentStatus.partial);
        }

        OrderStatus derivedStatus = calculateDerivedOrderStatus(allItems, order.getStatus());
        order.setStatus(derivedStatus);

        OrderEntity updated = orderRepository.save(order);
        OrderResponse response = mapToResponseWithItems(updated, allItems);

        // Bắn WebSocket thông báo Bếp & POS có ĐỢT GỌI MÓN MỚI vào bàn này
        sendWebSocketEvent("ORDER_ROUND_ADDED", response);

        return response;
    }

    private void validateMealPeriodForDish(com.omniresto.backend.domain.MenuItemEntity menuItem, LocalTime now, MealPeriod currentPeriod) {
        if (!MealPeriod.isAvailableNow(menuItem.getMealPeriods(), now)) {
            String periodDesc = MealPeriod.getPeriodDescription(menuItem.getMealPeriods());
            throw new BadRequestException(
                    "Món '" + menuItem.getName() + "' chỉ phục vụ vào: " + periodDesc
                            + ". Hiện tại đã hết thời gian phục vụ của món này (" + currentPeriod.getDisplayName()
                            + "), quý khách vui lòng chọn các món thuộc thực đơn hiện tại!"
            );
        }
    }

    @Transactional
    public OrderResponse updateOrderStatus(String id, OrderStatus status) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
        entity.setStatus(status);
        OrderEntity updated = orderRepository.save(entity);
        OrderResponse response = mapToResponse(updated);

        sendWebSocketEvent("ORDER_STATUS_CHANGED", response);
        return response;
    }

    @Transactional
    public OrderResponse updateOrderItemStatus(String itemId, OrderItemStatus itemStatus) {
        OrderItemEntity item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dòng món với ID: " + itemId));
        item.setStatus(itemStatus);
        orderItemRepository.save(item);

        OrderEntity order = item.getOrder();
        List<OrderItemEntity> allItems = orderItemRepository.findByOrder_Id(order.getId());
        OrderStatus newOrderStatus = calculateDerivedOrderStatus(allItems, order.getStatus());
        order.setStatus(newOrderStatus);
        OrderEntity savedOrder = orderRepository.save(order);

        OrderResponse response = mapToResponseWithItems(savedOrder, allItems);
        sendWebSocketEvent("ORDER_ITEM_STATUS_CHANGED", response);
        return response;
    }

    @Transactional
    public OrderResponse cancelOrderItem(String orderId, String itemId, String reason, String staffId) {
        OrderItemEntity item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dòng món với ID: " + itemId));

        if (!item.getOrder().getId().equals(orderId)) {
            throw new BadRequestException("Món này không thuộc về đơn hàng " + orderId);
        }

        if (item.getStatus() == OrderItemStatus.served) {
            throw new BadRequestException("Không thể hủy món đã được phục vụ ra bàn!");
        }
        if (item.getStatus() == OrderItemStatus.cancelled) {
            throw new BadRequestException("Món này đã bị hủy trước đó!");
        }

        item.setStatus(OrderItemStatus.cancelled);
        String cancelNote = "[Đã hủy" + (reason != null && !reason.isBlank() ? ": " + reason : "") + "]";
        item.setNotes(item.getNotes() != null && !item.getNotes().isBlank()
                ? item.getNotes() + " | " + cancelNote
                : cancelNote);
        orderItemRepository.save(item);

        OrderEntity order = item.getOrder();
        List<OrderItemEntity> allItems = orderItemRepository.findByOrder_Id(order.getId());

        BigDecimal recalculatedTotal = allItems.stream()
                .filter(it -> it.getStatus() != OrderItemStatus.cancelled)
                .map(it -> it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(recalculatedTotal);

        OrderStatus derivedStatus = calculateDerivedOrderStatus(allItems, order.getStatus());
        order.setStatus(derivedStatus);
        OrderEntity updatedOrder = orderRepository.save(order);

        OrderResponse response = mapToResponseWithItems(updatedOrder, allItems);
        sendWebSocketEvent("ORDER_ITEM_CANCELLED", response);
        return response;
    }

    public static OrderStatus calculateDerivedOrderStatus(List<OrderItemEntity> allItems, OrderStatus currentOrderStatus) {
        if (allItems == null || allItems.isEmpty()) {
            return currentOrderStatus != null ? currentOrderStatus : OrderStatus.pending;
        }

        List<OrderItemEntity> activeItems = allItems.stream()
                .filter(it -> it.getStatus() != OrderItemStatus.cancelled)
                .toList();

        if (activeItems.isEmpty()) {
            return OrderStatus.cancelled;
        }

        boolean hasPreparing = activeItems.stream().anyMatch(it -> it.getStatus() == OrderItemStatus.preparing);
        if (hasPreparing) {
            return OrderStatus.preparing;
        }

        boolean hasConfirmed = activeItems.stream().anyMatch(it -> it.getStatus() == OrderItemStatus.confirmed);
        if (hasConfirmed) {
            return OrderStatus.confirmed;
        }

        boolean hasPending = activeItems.stream().anyMatch(it -> it.getStatus() == OrderItemStatus.pending);
        if (hasPending) {
            return OrderStatus.pending;
        }

        boolean allServed = activeItems.stream().allMatch(it -> it.getStatus() == OrderItemStatus.served);
        if (allServed) {
            return OrderStatus.completed;
        }

        return OrderStatus.ready;
    }

    private void sendWebSocketEvent(String eventType, OrderResponse orderResponse) {
        try {
            OrderEventMessage message = OrderEventMessage.builder()
                    .eventType(eventType)
                    .order(orderResponse)
                    .build();
            messagingTemplate.convertAndSend("/topic/orders", message);
        } catch (Exception e) {
            System.err.println("Failed to broadcast WebSocket event: " + e.getMessage());
        }
    }

    private OrderResponse mapToResponse(OrderEntity entity) {
        List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(entity.getId());
        return mapToResponseWithItems(entity, items);
    }

    private OrderResponse mapToResponseWithItems(OrderEntity entity, List<OrderItemEntity> items) {
        List<OrderItemResponse> itemResponses = items.stream().map(i -> {
            OrderItemResponse res = new OrderItemResponse();
            res.setId(i.getId());
            res.setMenuItemId(i.getMenuItemId());
            res.setName(i.getItemName());
            res.setQuantity(i.getQuantity());
            res.setPrice(i.getUnitPrice());
            res.setNotes(i.getNotes());
            res.setRoundNo(i.getRoundNo());
            res.setStatus(i.getStatus());
            res.setAddedAt(i.getAddedAt());
            res.setConfirmedByStaffId(i.getConfirmedByStaffId());
            res.setConfirmedAt(i.getConfirmedAt());
            return res;
        }).collect(Collectors.toList());

        OrderResponse res = new OrderResponse();
        res.setId(entity.getId());
        res.setOrderNumber(entity.getOrderNumber());
        res.setTableSessionId(entity.getTableSessionId());
        res.setOrderType(entity.getOrderType());
        res.setTableNo(entity.getTableNo());
        res.setStatus(entity.getStatus());
        res.setPaymentStatus(entity.getPaymentStatus());
        res.setTotalAmount(entity.getTotalAmount());
        res.setPaymentMethod(entity.getPaymentMethod());
        res.setCustomerName(entity.getCustomerName());
        res.setItems(itemResponses);
        res.setCreatedAt(entity.getCreatedAt() != null ? entity.getCreatedAt() : LocalDateTime.now());
        return res;
    }
}
