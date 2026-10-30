package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.domain.CategoryOptionEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.OrderItemOptionEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.MealPeriod;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.domain.enums.OrderItemStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentStatus;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import com.omniresto.backend.domain.VoucherEntity;
import com.omniresto.backend.domain.VoucherRedemptionEntity;
import com.omniresto.backend.domain.enums.RedemptionStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ConflictException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.helper.MealPeriodHelper;
import com.omniresto.backend.domain.PaymentTransactionEntity;
import com.omniresto.backend.domain.enums.PaymentMethod;
import com.omniresto.backend.domain.enums.PaymentTransactionStatus;
import com.omniresto.backend.model.order.request.OrderItemRequest;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderItemOptionResponse;
import com.omniresto.backend.model.order.response.OrderItemResponse;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.CategoryOptionRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import com.omniresto.backend.repository.PaymentTransactionRepository;
import com.omniresto.backend.repository.TableSessionRepository;
import com.omniresto.backend.repository.VoucherRedemptionRepository;
import com.omniresto.backend.repository.VoucherRepository;
import com.omniresto.backend.util.SecurityUtils;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final TableSessionRepository tableSessionRepository;
    private final OrderWebSocketHandler orderWebSocketHandler;
    private final ObjectMapper objectMapper;
    private final VoucherRepository voucherRepository;
    private final VoucherRedemptionRepository voucherRedemptionRepository;
    private final VoucherService voucherService;
    private final PaymentTransactionRepository paymentTransactionRepository;

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

    public List<OrderResponse> getOrdersByCustomer(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            return Collections.emptyList();
        }
        List<OrderEntity> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId.trim());
        return orders.stream()
                .map(this::mapToResponse)
                .toList();
    }

    public OrderResponse getOrderById(String id) {
        OrderEntity entity = findOrderById(id);
        return mapToResponse(entity);
    }

    private OrderEntity findOrderById(String id) {
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException("Mã đơn hàng không được để trống!");
        }
        String trimmed = id.trim();
        return orderRepository.findById(trimmed)
                .or(() -> orderRepository.findByOrderNumber(trimmed))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID hoặc mã: " + id));
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

            // Double-check Idempotency Key sau khi có khóa phiên bàn để chống race condition khi 2 request cùng gửi song song
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                CachedIdempotencyEntry cached = idempotencyCache.get(idempotencyKey.trim());
                if (cached != null) {
                    log.info("⚡ Idempotency key '{}' matched after row lock, returning cached response", idempotencyKey);
                    return cached.getResponse();
                }
            }

            // Chặn thêm món khi hóa đơn đang đóng băng để thanh toán
            if (lockedSession.getStatus() == TableSessionStatus.payment_requested) {
                throw new ConflictException(
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

            validateMenuItemAvailability(m);
            validateMealPeriodForDish(m, now, currentPeriod);

            // Xác thực và lấy danh sách options hợp lệ từ Database (chặn chọn chéo danh mục, kiểm tra còn hàng & tối đa 1 size)
            List<CategoryOptionEntity> chosenOptions = validateAndResolveOptions(m, itemReq.getOptionIds());

            BigDecimal optionsExtra = chosenOptions.stream()
                    .map(CategoryOptionEntity::getPrice)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal unitPrice = (m.getBasePrice() != null ? m.getBasePrice() : BigDecimal.ZERO).add(optionsExtra);

            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;
            calculatedTotal = calculatedTotal.add(unitPrice.multiply(BigDecimal.valueOf(qty)));

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(saved)
                    .menuItemId(m.getId())
                    .itemName(m.getName()) // Tên món gốc chuẩn hóa
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .notes(itemReq.getNotes())
                    .roundNo(1) // Đợt 1
                    .status(initialItemStatus)
                    .addedAt(LocalDateTime.now(DEFAULT_ZONE))
                    .build();
            item.setId("item-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));

            for (CategoryOptionEntity opt : chosenOptions) {
                OrderItemOptionEntity optEntity = OrderItemOptionEntity.builder()
                        .optionId(opt.getId())
                        .optionName(opt.getName())
                        .optionType(opt.getOptionType())
                        .price(opt.getPrice() != null ? opt.getPrice() : BigDecimal.ZERO)
                        .build();
                item.addOption(optEntity);
            }

            OrderItemEntity savedItem = orderItemRepository.save(item);
            saved.getItems().add(savedItem);
            itemEntities.add(savedItem);

        }

        BigDecimal subtotal = calculatedTotal;
        BigDecimal finalTotal = calculatedTotal;

        if (request.getVoucherCode() != null && !request.getVoucherCode().isBlank()) {
            Optional<String> customerIdOpt = SecurityUtils.getCurrentCustomerIdOptional();
            if (customerIdOpt.isEmpty()) {
                throw new BadRequestException("Vui lòng đăng nhập tài khoản thành viên để sử dụng mã ưu đãi!");
            }
            String customerId = customerIdOpt.get();

            // 1. Pipeline thẩm định toàn diện voucher
            VoucherEntity voucher = voucherService.validateAndGetVoucher(request.getVoucherCode(), customerId, subtotal);

            // 2. Trừ lượt dùng toàn hệ thống nguyên tử (Atomic Database Lock / Row-level update)
            int updatedRows = voucherRepository.incrementUsedQuantityAtomic(voucher.getId());
            if (updatedRows == 0) {
                throw new ConflictException("Rất tiếc, mã khuyến mãi vừa hết lượt sử dụng trên toàn hệ thống!");
            }

            // 3. Tính toán số lượt dùng của khách hàng và thứ tự sử dụng (usageSequence)
            long userUsedCount = voucherRedemptionRepository.countByVoucherIdAndCustomerIdAndStatus(
                    voucher.getId(), customerId, RedemptionStatus.applied
            );
            int usageSequence = (int) userUsedCount + 1;

            BigDecimal discount = voucherService.calculateDiscount(voucher, subtotal);
            finalTotal = subtotal.subtract(discount).max(BigDecimal.ZERO);

            // 4. Lưu bản ghi sổ cái (Voucher Redemption Ledger) để bảo vệ Unique Constraint (voucher_id, customer_id, usage_sequence)
            VoucherRedemptionEntity redemption = VoucherRedemptionEntity.builder()
                    .id("vcr-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24))
                    .voucherId(voucher.getId())
                    .customerId(customerId)
                    .orderId(saved.getId())
                    .usageSequence(usageSequence)
                    .discountAmount(discount)
                    .redeemedAt(LocalDateTime.now(DEFAULT_ZONE))
                    .status(RedemptionStatus.applied)
                    .build();

            try {
                voucherRedemptionRepository.save(redemption);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Race condition detected on voucher per-user quota: {}", ex.getMessage());
                voucherRepository.decrementUsedQuantityAtomic(voucher.getId());
                throw new ConflictException("Bạn đã dùng hết số lượt cho phép của mã khuyến mãi này!");
            }

            saved.setCustomerId(customerId);
            saved.setVoucherId(voucher.getId());
            saved.setVoucherCode(voucher.getCode());
            saved.setSubtotal(subtotal);
            saved.setDiscountAmount(discount);
        } else {
            saved.setSubtotal(subtotal);
            saved.setDiscountAmount(BigDecimal.ZERO);
            SecurityUtils.getCurrentCustomerIdOptional().ifPresent(saved::setCustomerId);
        }

        saved.setTotalAmount(finalTotal);
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

            validateMenuItemAvailability(m);
            validateMealPeriodForDish(m, now, currentPeriod);

            // Xác thực và lấy danh sách options hợp lệ từ Database (chặn chọn chéo danh mục, kiểm tra còn hàng & tối đa 1 size)
            List<CategoryOptionEntity> chosenOptions = validateAndResolveOptions(m, itemReq.getOptionIds());

            BigDecimal optionsExtra = chosenOptions.stream()
                    .map(CategoryOptionEntity::getPrice)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal unitPrice = (m.getBasePrice() != null ? m.getBasePrice() : BigDecimal.ZERO).add(optionsExtra);

            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(order)
                    .menuItemId(m.getId())
                    .itemName(m.getName()) // Tên món gốc chuẩn hóa
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .notes(itemReq.getNotes())
                    .roundNo(nextRoundNo) // Đợt N
                    .status(newRoundItemStatus)
                    .addedAt(LocalDateTime.now(DEFAULT_ZONE))
                    .build();
            item.setId("item-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));

            for (CategoryOptionEntity opt : chosenOptions) {
                OrderItemOptionEntity optEntity = OrderItemOptionEntity.builder()
                        .optionId(opt.getId())
                        .optionName(opt.getName())
                        .optionType(opt.getOptionType())
                        .price(opt.getPrice() != null ? opt.getPrice() : BigDecimal.ZERO)
                        .build();
                item.addOption(optEntity);
            }

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



    private void validateMenuItemAvailability(MenuItemEntity menuItem) {
        if (menuItem.getStatus() == MenuStatus.out_of_stock) {
            throw new BadRequestException("Món '" + menuItem.getName() + "' hiện đã tạm hết hàng, quý khách vui lòng chọn món khác!");
        }
        if (menuItem.getStatus() == MenuStatus.discontinued) {
            throw new BadRequestException("Món '" + menuItem.getName() + "' hiện đã ngừng phục vụ!");
        }
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

    /**
     * Xác thực và phân giải danh sách tùy chọn (Options: Size/Topping) của món ăn
     * Đảm bảo:
     * 1. Option tồn tại trong Database
     * 2. Option phải thuộc đúng Category của món ăn (chặn Cross-Category Injection)
     * 3. Option đang mở bán (status = AVAILABLE)
     * 4. Tối đa 1 option loại SIZE cho mỗi món
     */
    private List<CategoryOptionEntity> validateAndResolveOptions(MenuItemEntity menuItem, List<String> optionIds) {
        if (optionIds == null || optionIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Loại bỏ trùng lặp ID (ngăn chặn duplicate injection)
        List<String> distinctIds = optionIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (distinctIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<CategoryOptionEntity> options = categoryOptionRepository.findAllById(distinctIds);

        if (options.size() != distinctIds.size()) {
            throw new BadRequestException("Một hoặc nhiều tùy chọn món ăn không tồn tại trong hệ thống!");
        }

        String itemCategoryId = (menuItem.getCategory() != null) ? menuItem.getCategory().getId() : null;
        int sizeCount = 0;

        for (CategoryOptionEntity opt : options) {
            // 1. Kiểm tra danh mục
            if (itemCategoryId != null && opt.getCategory() != null && !itemCategoryId.equals(opt.getCategory().getId())) {
                throw new BadRequestException("Tùy chọn '" + opt.getName() + "' không thuộc danh mục của món '" + menuItem.getName() + "'!");
            }

            // 2. Kiểm tra trạng thái còn hàng
            if (opt.getStatus() != null && !"AVAILABLE".equalsIgnoreCase(opt.getStatus().trim())) {
                throw new BadRequestException("Tùy chọn '" + opt.getName() + "' hiện đang tạm ngưng phục vụ!");
            }

            // 3. Quy tắc kiểm tra Size
            if (opt.getOptionType() == com.omniresto.backend.domain.enums.OptionType.size) {
                sizeCount++;
                if (sizeCount > 1) {
                    throw new BadRequestException("Món '" + menuItem.getName() + "' chỉ được chọn tối đa một kích cỡ (size)!");
                }
            }
        }

        return options;
    }

    private void validateOrderStatusTransition(OrderEntity order, OrderStatus targetStatus) {
        validateOrderStatusTransition(order, targetStatus, false);
    }

    private void validateOrderStatusTransition(OrderEntity order, OrderStatus targetStatus, boolean autoPay) {
        OrderStatus current = order.getStatus();
        if (current == targetStatus) {
            return;
        }
        if (current == OrderStatus.cancelled) {
            throw new ConflictException("Đơn hàng #" + order.getOrderNumber() + " đã bị hủy, không thể thay đổi trạng thái!");
        }
        if (current == OrderStatus.completed) {
            throw new ConflictException("Đơn hàng #" + order.getOrderNumber() + " đã hoàn tất, không thể thay đổi trạng thái!");
        }
        if (targetStatus == OrderStatus.completed && order.getPaymentStatus() != PaymentStatus.paid) {
            if (autoPay) {
                order.setPaymentStatus(PaymentStatus.paid);
                log.info("Đơn hàng #{} được tự động thu tiền / xác nhận thanh toán thành công khi hoàn tất (Trả Món).", order.getOrderNumber());
            } else {
                throw new BadRequestException("Không thể hoàn tất đơn hàng #" + order.getOrderNumber() 
                        + " vì chưa thanh toán thành công (Trạng thái thanh toán: " + order.getPaymentStatus() + "). Vui lòng thu tiền trước khi hoàn tất!");
            }
        }
    }

    @Transactional
    public OrderResponse updateOrderStatus(String id, OrderStatus status) {
        return updateOrderStatus(id, status, false);
    }

    @Transactional
    public OrderResponse updateOrderStatus(String id, OrderStatus status, boolean autoPay) {
        OrderEntity entity = findOrderById(id);
        List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(entity.getId());

        validateOrderStatusTransition(entity, status, autoPay);

        if (status == OrderStatus.cancelled) {
            // Hủy toàn bộ đơn: Hủy các món trong đơn và đưa tổng tiền về 0
            for (OrderItemEntity it : items) {
                if (it.getStatus() != OrderItemStatus.cancelled) {
                    it.setStatus(OrderItemStatus.cancelled);
                    orderItemRepository.save(it);
                }
            }
            entity.setStatus(OrderStatus.cancelled);
            entity.setTotalAmount(BigDecimal.ZERO);

            // Hoàn lại lượt dùng voucher nguyên tử và cập nhật trạng thái sổ cái (Idempotent compensation)
            if (entity.getVoucherId() != null) {
                voucherRepository.decrementUsedQuantityAtomic(entity.getVoucherId());
                voucherRedemptionRepository.findByOrderIdAndStatus(entity.getId(), RedemptionStatus.applied)
                        .ifPresent(redemption -> {
                            redemption.setStatus(RedemptionStatus.reverted);
                            voucherRedemptionRepository.save(redemption);
                            log.info("Đã hoàn lại lượt dùng voucher {} cho khách hàng {} từ đơn hàng {}",
                                    entity.getVoucherCode(), entity.getCustomerId(), entity.getId());
                        });
            }

            // Nếu đơn gắn với phiên bàn đang chờ thanh toán, hủy trạng thái đóng băng để bàn trở về active
            if (entity.getTableSessionId() != null) {
                tableSessionRepository.findById(entity.getTableSessionId()).ifPresent(session -> {
                    if (session.getStatus() == TableSessionStatus.payment_requested) {
                        session.setStatus(TableSessionStatus.active);
                        tableSessionRepository.save(session);
                    }
                });
            }
        } else {
            // Cập nhật trạng thái tổng thể hợp lệ
            entity.setStatus(status);
            if (status == OrderStatus.completed) {
                // Khi hoàn tất đơn / trả món, chuyển toàn bộ các món chưa hủy thành served
                for (OrderItemEntity it : items) {
                    if (it.getStatus() != OrderItemStatus.cancelled && it.getStatus() != OrderItemStatus.served) {
                        it.setStatus(OrderItemStatus.served);
                        it.setConfirmedAt(LocalDateTime.now(DEFAULT_ZONE));
                        orderItemRepository.save(it);
                    }
                }
            }
        }

        OrderEntity updated = orderRepository.save(entity);
        OrderResponse response = mapToResponseWithItems(updated, items);

        sendWebSocketEvent("ORDER_STATUS_CHANGED", response);
        return response;
    }

    /**
     * Thu ngân / nhân viên xác nhận thanh toán trực tiếp cho một đơn hàng cụ thể
     * (Đặc biệt hữu ích cho đơn Mang về - Takeaway và Giao hàng - Delivery)
     */
    @Transactional
    public OrderResponse confirmOrderPayment(
            String id,
            PaymentMethod method,
            BigDecimal amountReceived,
            boolean autoComplete,
            String staffId
    ) {
        return confirmOrderPayment(id, method, amountReceived, autoComplete, staffId, false);
    }

    @Transactional
    public OrderResponse confirmOrderPayment(
            String id,
            PaymentMethod method,
            BigDecimal amountReceived,
            boolean autoComplete,
            String staffId,
            boolean forceConfirm
    ) {
        OrderEntity entity = findOrderById(id);
        if (entity.getStatus() == OrderStatus.cancelled) {
            throw new BadRequestException("Không thể thu tiền cho đơn hàng đã bị hủy #" + entity.getOrderNumber());
        }

        List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(entity.getId());
        List<OrderItemEntity> unservedItems = items.stream()
                .filter(it -> it.getStatus() != OrderItemStatus.served && it.getStatus() != OrderItemStatus.cancelled)
                .toList();

        if (!unservedItems.isEmpty()) {
            String unservedSummary = unservedItems.stream()
                    .map(it -> it.getItemName() + " (SL: " + it.getQuantity() + " - " + it.getStatus() + ")")
                    .distinct()
                    .collect(Collectors.joining(", "));

            if (!forceConfirm) {
                throw new ConflictException(
                        "Đơn #" + entity.getOrderNumber() + " còn " + unservedItems.size() + " món chưa hoàn tất phục vụ (chưa SERVED): ["
                                + unservedSummary + "]. Thu ngân vui lòng kiểm tra hoặc bật cờ forceConfirm=true để ghi đè xác nhận!"
                );
            }

            log.warn("⚠️ [AUDIT] Thu ngân/Nhân viên [{}] đã GHI ĐÈ XÁC NHẬN (FORCE CONFIRM) thanh toán đơn #{} khi còn {} món chưa SERVED: [{}]",
                    (staffId != null ? staffId : "POS"), entity.getOrderNumber(), unservedItems.size(), unservedSummary);
        }

        entity.setPaymentStatus(PaymentStatus.paid);
        if (method != null) {
            entity.setPaymentMethod(method);
        }

        if (autoComplete) {
            entity.setStatus(OrderStatus.completed);
            for (OrderItemEntity it : items) {
                if (it.getStatus() != OrderItemStatus.cancelled && it.getStatus() != OrderItemStatus.served) {
                    it.setStatus(OrderItemStatus.served);
                    it.setConfirmedAt(LocalDateTime.now(DEFAULT_ZONE));
                    orderItemRepository.save(it);
                }
            }
        }

        // Ghi nhận bản ghi thanh toán để đối soát doanh thu POS
        try {
            BigDecimal expected = entity.getTotalAmount() != null ? entity.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal received = (amountReceived != null && amountReceived.compareTo(BigDecimal.ZERO) > 0)
                    ? amountReceived : expected;
            PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                    .orderId(entity.getId())
                    .transactionReference("TXN-" + System.currentTimeMillis())
                    .amountExpected(expected)
                    .amountReceived(received)
                    .paymentGateway(entity.getPaymentMethod() != null ? entity.getPaymentMethod().name() : "CASH")
                    .status(PaymentTransactionStatus.success)
                    .rawPayload("Staff confirmed: " + (staffId != null ? staffId : "STAFF-POS") + " for order #" + entity.getOrderNumber())
                    .build();
            tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
            paymentTransactionRepository.save(tx);
        } catch (Exception ex) {
            log.warn("Không thể lưu payment transaction cho đơn #{}: {}", entity.getOrderNumber(), ex.getMessage());
        }

        OrderEntity saved = orderRepository.save(entity);
        OrderResponse response = mapToResponseWithItems(saved, items);

        sendWebSocketEvent("ORDER_PAYMENT_CONFIRMED", response);
        if (autoComplete) {
            sendWebSocketEvent("ORDER_STATUS_CHANGED", response);
        }

        log.info("✅ Xác nhận thanh toán thành công cho đơn #{} (Phương thức: {}, Hoàn tất đơn: {})",
                entity.getOrderNumber(), entity.getPaymentMethod(), autoComplete);
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
        return cancelOrderItem(orderId, itemId, reason, staffId, null);
    }

    @Transactional
    public OrderResponse cancelOrderItem(String orderId, String itemId, String reason, String staffId, String sessionToken) {
        OrderItemEntity item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dòng món với ID: " + itemId));

        if (!item.getOrder().getId().equals(orderId)) {
            throw new BadRequestException("Món này không thuộc về đơn hàng " + orderId);
        }

        if (item.getStatus() == OrderItemStatus.served || item.getStatus() == OrderItemStatus.ready) {
            throw new BadRequestException("Không thể hủy món đã nấu xong hoặc đã phục vụ ra bàn!");
        }
        if (item.getStatus() == OrderItemStatus.cancelled) {
            throw new BadRequestException("Món này đã bị hủy trước đó!");
        }

        if ("GUEST".equals(staffId)) {
            if (sessionToken == null || sessionToken.isBlank()) {
                throw new org.springframework.security.access.AccessDeniedException("Truy cập bị từ chối: Thiếu phiên bàn để xác thực quyền hủy món!");
            }
            TableSessionEntity callerSession = tableSessionRepository.findBySessionToken(sessionToken.trim())
                    .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Phiên bàn không tồn tại hoặc đã hết hiệu lực!"));

            if (callerSession.getStatus() == TableSessionStatus.closed || callerSession.getStatus() == TableSessionStatus.expired) {
                throw new org.springframework.security.access.AccessDeniedException("Phiên bàn đã kết thúc, không thể thực hiện thao tác hủy món!");
            }

            // IDOR Protection: Đảm bảo order này thuộc về phiên bàn của khách
            if (item.getOrder().getTableSessionId() == null || !item.getOrder().getTableSessionId().equals(callerSession.getId())) {
                log.warn("🚨 [IDOR DETECTED] Session {} attempted to cancel item {} belonging to session {}",
                        callerSession.getId(), itemId, item.getOrder().getTableSessionId());
                throw new org.springframework.security.access.AccessDeniedException("Truy cập bị từ chối: Món ăn này không thuộc về bàn của bạn!");
            }

            if (item.getStatus() != OrderItemStatus.pending) {
                throw new BadRequestException("Quý khách chỉ có thể tự hủy món khi món đang ở trạng thái Chờ xác nhận (PENDING). Món đã vào bếp chế biến xin vui lòng liên hệ nhân viên phục vụ!");
            }
        }

        if (item.getStatus() == OrderItemStatus.preparing) {
            // Món đang nấu trong bếp: Chỉ Quản lý mới được hủy và bắt buộc có lý do
            boolean isStaffExplicitWaiter = staffId != null && (staffId.toUpperCase().contains("WAITER") || staffId.toUpperCase().contains("STAFF") || staffId.toUpperCase().contains("CHEF"));
            boolean isManager = !isStaffExplicitWaiter && (SecurityUtils.hasAnyRole("ADMIN", "STORE_MANAGER")
                    || (staffId != null && (staffId.toUpperCase().contains("MANAGER") || staffId.toUpperCase().contains("MGR") || staffId.toUpperCase().contains("ADMIN"))));
            if (!isManager) {
                throw new BadRequestException("Món đang trong quá trình chế biến (PREPARING)! Chỉ Quản lý nhà hàng mới có quyền hủy món này.");
            }
            if (reason == null || reason.trim().isBlank()) {
                throw new BadRequestException("Bắt buộc phải nhập lý do khi hủy món đang trong quá trình chế biến!");
            }
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

            if (i.getOptions() != null && !i.getOptions().isEmpty()) {
                List<OrderItemOptionResponse> optResponses = i.getOptions().stream().map(opt -> OrderItemOptionResponse.builder()
                        .id(opt.getId())
                        .optionId(opt.getOptionId())
                        .optionName(opt.getOptionName())
                        .optionType(opt.getOptionType())
                        .price(opt.getPrice())
                        .build()).toList();
                res.setOptions(optResponses);
            }
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
        res.setSubtotal(entity.getSubtotal() != null ? entity.getSubtotal() : entity.getTotalAmount());
        res.setDiscountAmount(entity.getDiscountAmount() != null ? entity.getDiscountAmount() : BigDecimal.ZERO);
        res.setVoucherId(entity.getVoucherId());
        res.setVoucherCode(entity.getVoucherCode());
        res.setCustomerId(entity.getCustomerId());
        res.setPaymentMethod(entity.getPaymentMethod());
        res.setCustomerName(entity.getCustomerName());
        res.setItems(itemResponses);
        res.setCreatedAt(entity.getCreatedAt() != null ? entity.getCreatedAt() : LocalDateTime.now(DEFAULT_ZONE));
        return res;
    }
}
