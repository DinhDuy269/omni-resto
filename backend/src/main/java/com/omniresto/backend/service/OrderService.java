package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.domain.CategoryOptionEntity;
import com.omniresto.backend.domain.MenuItemEntity;
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
import com.omniresto.backend.helper.MealPeriodHelper;
import com.omniresto.backend.model.order.request.OrderItemRequest;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderItemResponse;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.CategoryOptionRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final CategoryOptionRepository categoryOptionRepository;
    private final TableSessionService tableSessionService;
    private final OrderWebSocketHandler orderWebSocketHandler;
    private final ObjectMapper objectMapper;

    @Setter
    @Value("${restaurant.business-hours.enforce:true}")
    private boolean enforceBusinessHours = true;

    @Setter
    private Clock clock = Clock.system(DEFAULT_ZONE);

    // Cache Idempotency-Key chống gửi trùng (TTL 60 giây)
    private final Map<String, CachedIdempotencyEntry> idempotencyCache = new ConcurrentHashMap<>();

    @Getter
    private static class CachedIdempotencyEntry {
        private final OrderResponse response;
        private final long createdAtEpochMs;

        public CachedIdempotencyEntry(OrderResponse response) {
            this.response = response;
            this.createdAtEpochMs = System.currentTimeMillis();
        }

        public boolean isExpired(long ttlMs) {
            return (System.currentTimeMillis() - createdAtEpochMs) > ttlMs;
        }
    }

    public List<OrderResponse> getAllOrders(OrderStatus status) {
        List<OrderEntity> orders;
        if (status != null) {
            orders = orderRepository.findByStatusWithItems(status);
        } else {
            orders = orderRepository.findAllWithItems();
        }

        return orders.stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<OrderResponse> getOrdersBySession(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return Collections.emptyList();
        }
        var session = tableSessionService.validateAndTouchSession(sessionToken);
        List<OrderEntity> orders = orderRepository.findByTableSessionIdWithItems(session.getId());
        return orders.stream()
                .map(this::mapToResponse)
                .toList();
    }

    public OrderResponse getOrderById(String id) {
        OrderEntity entity = findOrderById(id);
        return mapToResponse(entity);
    }

    private OrderEntity findOrderById(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        return createOrder(request, null, null);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request, String sessionToken) {
        return createOrder(request, sessionToken, null);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request, String sessionToken, String idempotencyKey) {
        // ── 0. Kiểm tra chống gửi trùng (Idempotency Key) ─────────────────────
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String trimmedKey = idempotencyKey.trim();
            cleanExpiredIdempotencyKeys();
            CachedIdempotencyEntry cached = idempotencyCache.get(trimmedKey);
            if (cached != null) {
                log.info("⚡ Idempotency key '{}' matched existing order, returning cached response without duplicate", trimmedKey);
                return cached.getResponse();
            }
        }

        // ── 1. Kiểm tra validation cơ bản ────────────────────────────────────
        if (request == null || request.getOrderType() == null) {
            throw new BadRequestException("Loại đơn hàng (orderType) không được để trống!");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Danh sách món ăn không được để trống!");
        }

        // ── 2. Kiểm tra thời gian phục vụ của nhà hàng ────────────────────────
        LocalTime now = LocalTime.now(clock);
        MealPeriod currentPeriod = MealPeriodHelper.getCurrentPeriod(now);

        if (enforceBusinessHours && currentPeriod == MealPeriod.closed) {
            throw new BadRequestException(
                    "Nhà hàng hiện đang trong giờ đóng cửa (22:00 - 06:00). Quý khách vui lòng đặt món vào ca Sáng từ 06:00!"
            );
        }

        // ── 3. Bảo mật phiên bàn & Khóa phiên bi quan (Pessimistic Lock) ──────
        String resolvedTableId = null;
        String resolvedTableNo = request.getTableNo();
        TableSessionEntity lockedSession = null;

        if (request.getOrderType() == OrderType.dine_in) {
            if (sessionToken == null || sessionToken.isBlank()) {
                throw new BadRequestException(
                        "Đơn dùng tại bàn bắt buộc phải quét mã QR tại bàn để xác thực phiên (thiếu Header X-Table-Session)!"
                );
            }

            // Khóa dòng phiên bàn (SELECT ... FOR UPDATE) để chống Race Condition khi nhiều máy cùng đặt
            lockedSession = tableSessionService.validateAndTouchSessionWithLock(sessionToken);
            resolvedTableId = lockedSession.getTableId();
            resolvedTableNo = lockedSession.getTableNo();

            // Chặn thêm món khi hóa đơn đang đóng băng để thanh toán
            if (lockedSession.getStatus() == TableSessionStatus.payment_requested) {
                throw new BadRequestException(
                        "Hóa đơn của " + lockedSession.getTableNo() + " đang được đóng băng để thanh toán. Quý khách vui lòng bấm 'Hủy yêu cầu thanh toán' trên ứng dụng nếu muốn tiếp tục gọi thêm món!"
                );
            }

            // Kiểm tra xem bàn này đã có Hóa đơn mở (Active Order) chưa
            List<OrderStatus> activeStatuses = List.of(
                    OrderStatus.pending,
                    OrderStatus.confirmed,
                    OrderStatus.preparing,
                    OrderStatus.ready,
                    OrderStatus.completed
            );

            Optional<OrderEntity> activeOrderOpt = orderRepository
                    .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(lockedSession.getId(), activeStatuses);

            if (activeOrderOpt.isPresent()) {
                // [CHÍNH SÁCH CỘNG DỒN ĐỢT GỌI MỚI (ROUND) VÀO HÓA ĐƠN CŨ]
                OrderEntity existingOrder = activeOrderOpt.get();
                OrderResponse response = appendNewRoundToOrder(existingOrder, request, now, currentPeriod, lockedSession);
                cacheIdempotencyKey(idempotencyKey, response);
                return response;
            }
        }

        // ── 4. Chưa có đơn mở (Đợt 1 / Khởi tạo hóa đơn mới) ──────────────────
        OrderResponse response = createFreshOrder(request, lockedSession, resolvedTableId, resolvedTableNo, now, currentPeriod);
        cacheIdempotencyKey(idempotencyKey, response);
        return response;
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

        OrderType resolvedOrderType = request.getOrderType();
        String orderId = "ord-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        String orderNum = "ORD-" + System.currentTimeMillis() + "-" + String.format("%04d", (int) (Math.random() * 10000));

        String customerName = request.getCustomerName();
        if ((customerName == null || customerName.isBlank()) && tableNo != null) {
            customerName = tableNo.toLowerCase().startsWith("bàn") ? tableNo : "Bàn " + tableNo;
        }

        // QUY TẮC AN TOÀN TRẠNG THÁI:
        // Đơn Dine-in: Nếu session đã xác nhận -> confirmed (hàng đợi bếp). Chưa xác nhận -> pending.
        // Đơn Takeaway & Delivery: Luôn là pending (chờ nhân viên/thu ngân duyệt đơn hoặc thanh toán).
        OrderStatus initialOrderStatus;
        OrderItemStatus initialItemStatus;

        if (resolvedOrderType == OrderType.dine_in) {
            boolean isSessionVerified = (session != null && session.isVerified());
            initialOrderStatus = isSessionVerified ? OrderStatus.confirmed : OrderStatus.pending;
            initialItemStatus = isSessionVerified ? OrderItemStatus.confirmed : OrderItemStatus.pending;
        } else {
            initialOrderStatus = OrderStatus.pending;
            initialItemStatus = OrderItemStatus.pending;
        }

        OrderEntity entity = OrderEntity.builder()
                .orderNumber(orderNum)
                .tableSessionId(session != null ? session.getId() : null)
                .orderType(resolvedOrderType)
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

        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getMenuItemId() == null || itemReq.getMenuItemId().isBlank()) {
                throw new BadRequestException("Mỗi món ăn phải có menuItemId hợp lệ từ hệ thống.");
            }

            MenuItemEntity m = menuItemRepository.findById(itemReq.getMenuItemId().trim())
                    .orElseThrow(() -> new BadRequestException("Món ăn không tồn tại hoặc đã ngừng phục vụ (ID: " + itemReq.getMenuItemId() + ")"));

            validateMealPeriodForDish(m, now, currentPeriod);

            // Tính đơn giá chính xác bao gồm giá gốc + phụ thu Topping/Size từ Database
            BigDecimal unitPrice = calculateUnitPriceWithOptions(m, itemReq);
            String displayItemName = buildItemDisplayName(m, itemReq);

            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;
            calculatedTotal = calculatedTotal.add(unitPrice.multiply(BigDecimal.valueOf(qty)));

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(saved)
                    .menuItemId(m.getId())
                    .itemName(displayItemName)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .notes(itemReq.getNotes())
                    .roundNo(1) // Đợt 1
                    .status(initialItemStatus)
                    .addedAt(LocalDateTime.now(DEFAULT_ZONE))
                    .build();
            item.setId("item-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
            saved.addItem(item);
            itemEntities.add(orderItemRepository.save(item));
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

        boolean isSessionVerified = (session != null && session.isVerified());
        OrderItemStatus newRoundItemStatus = isSessionVerified
                ? OrderItemStatus.confirmed
                : OrderItemStatus.pending;

        List<OrderItemEntity> newRoundItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getMenuItemId() == null || itemReq.getMenuItemId().isBlank()) {
                throw new BadRequestException("Mỗi món ăn gọi thêm phải có menuItemId hợp lệ từ hệ thống.");
            }

            MenuItemEntity m = menuItemRepository.findById(itemReq.getMenuItemId().trim())
                    .orElseThrow(() -> new BadRequestException("Món ăn gọi thêm không tồn tại hoặc đã ngừng phục vụ (ID: " + itemReq.getMenuItemId() + ")"));

            validateMealPeriodForDish(m, now, currentPeriod);

            BigDecimal unitPrice = calculateUnitPriceWithOptions(m, itemReq);
            String displayItemName = buildItemDisplayName(m, itemReq);

            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(order)
                    .menuItemId(m.getId())
                    .itemName(displayItemName)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .notes(itemReq.getNotes())
                    .roundNo(nextRoundNo) // Đợt N
                    .status(newRoundItemStatus)
                    .addedAt(LocalDateTime.now(DEFAULT_ZONE))
                    .build();
            item.setId("item-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
            newRoundItems.add(orderItemRepository.save(item));
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

    /**
     * Tính đơn giá dòng món = Giá gốc + phụ thu các Options (Topping/Size)
     */
    private BigDecimal calculateUnitPriceWithOptions(MenuItemEntity menuItem, OrderItemRequest itemReq) {
        BigDecimal unitPrice = menuItem.getBasePrice() != null ? menuItem.getBasePrice() : BigDecimal.ZERO;
        if (itemReq.getOptionIds() != null && !itemReq.getOptionIds().isEmpty()) {
            List<CategoryOptionEntity> options = categoryOptionRepository.findAllById(itemReq.getOptionIds());
            BigDecimal optionsExtra = options.stream()
                    .map(CategoryOptionEntity::getPrice)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            unitPrice = unitPrice.add(optionsExtra);
        }
        return unitPrice;
    }

    /**
     * Tên món hiển thị kèm tóm tắt Options
     */
    private String buildItemDisplayName(MenuItemEntity menuItem, OrderItemRequest itemReq) {
        if (itemReq.getOptionIds() == null || itemReq.getOptionIds().isEmpty()) {
            return menuItem.getName();
        }
        List<CategoryOptionEntity> options = categoryOptionRepository.findAllById(itemReq.getOptionIds());
        if (options.isEmpty()) {
            return menuItem.getName();
        }
        String optNames = options.stream().map(CategoryOptionEntity::getName).collect(Collectors.joining(", "));
        return menuItem.getName() + " (" + optNames + ")";
    }

    private void validateMealPeriodForDish(MenuItemEntity menuItem, LocalTime now, MealPeriod currentPeriod) {
        if (!enforceBusinessHours) {
            return;
        }
        if (!MealPeriodHelper.isAvailableNow(menuItem.getMealPeriods(), now)) {
            String periodDesc = MealPeriodHelper.getPeriodDescription(menuItem.getMealPeriods());
            throw new BadRequestException(
                    "Món '" + menuItem.getName() + "' chỉ phục vụ vào: " + periodDesc
                            + ". Hiện tại đã hết thời gian phục vụ của món này (" + MealPeriodHelper.getDisplayName(currentPeriod)
                            + "), quý khách vui lòng chọn các món thuộc thực đơn hiện tại!"
            );
        }
    }

    @Transactional
    public OrderResponse updateOrderStatus(String id, OrderStatus status) {
        OrderEntity entity = findOrderById(id);

        if (status == OrderStatus.cancelled) {
            // Hủy toàn bộ đơn: Hủy các món chưa phục vụ
            List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(entity.getId());
            for (OrderItemEntity it : items) {
                if (it.getStatus() != OrderItemStatus.served && it.getStatus() != OrderItemStatus.cancelled) {
                    it.setStatus(OrderItemStatus.cancelled);
                    orderItemRepository.save(it);
                }
            }
            entity.setStatus(OrderStatus.cancelled);
        } else {
            // Cập nhật trạng thái tổng thể hợp lệ
            entity.setStatus(status);
        }

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
        if (itemStatus == OrderItemStatus.served) {
            item.setConfirmedAt(LocalDateTime.now(DEFAULT_ZONE));
        }
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
        String auditActor = (staffId != null && !staffId.isBlank()) ? "Nhân viên " + staffId : "Hệ thống";
        String cancelNote = "[Đã hủy bởi " + auditActor + (reason != null && !reason.isBlank() ? ": " + reason : "") + "]";
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

        log.info("🚫 Item {} of order {} cancelled by {}. Reason: {}", itemId, orderId, auditActor, reason);

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
            if (orderWebSocketHandler != null && orderResponse != null) {
                Map<String, Object> message = Map.of(
                        "eventType", eventType,
                        "event_type", eventType,
                        "order", orderResponse
                );
                String json = objectMapper.writeValueAsString(message);
                orderWebSocketHandler.broadcast(json);
                log.info("📢 Broadcasted WebSocket event '{}' for order {}", eventType, orderResponse.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket event: {}", e.getMessage());
        }
    }

    private void cacheIdempotencyKey(String key, OrderResponse response) {
        if (key != null && !key.isBlank() && response != null) {
            idempotencyCache.put(key.trim(), new CachedIdempotencyEntry(response));
        }
    }

    private void cleanExpiredIdempotencyKeys() {
        long ttlMs = 60_000L; // 60 seconds TTL
        idempotencyCache.entrySet().removeIf(entry -> entry.getValue().isExpired(ttlMs));
    }

    private OrderResponse mapToResponse(OrderEntity entity) {
        List<OrderItemEntity> items = entity.getItems() != null && !entity.getItems().isEmpty()
                ? entity.getItems()
                : orderItemRepository.findByOrder_Id(entity.getId());
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
        }).toList();

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
        res.setCreatedAt(entity.getCreatedAt() != null ? entity.getCreatedAt() : LocalDateTime.now(DEFAULT_ZONE));
        return res;
    }
}
