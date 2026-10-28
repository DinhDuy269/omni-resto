package com.omniresto.backend.controller;

import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.OrderItemStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.PaymentMethod;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.TableSessionRepository;
import com.omniresto.backend.service.OrderService;
import com.omniresto.backend.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final TableSessionRepository tableSessionRepository;

    @Value("${omniresto.security.staff-key:STAFF_SECRET_KEY}")
    private String configuredStaffKey;

    private void checkStaffAccess(String staffKey) {
        boolean isStaff = (staffKey != null && !staffKey.isBlank() && staffKey.trim().equals(configuredStaffKey.trim()))
                || SecurityUtils.hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF");
        if (!isStaff) {
            throw new AccessDeniedException("Truy cập bị từ chối: Thao tác này chỉ dành cho nhân viên có thẩm quyền!");
        }
    }

    @GetMapping
    public List<OrderResponse> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        // 1. Nếu là khách tại bàn: chỉ cho phép xem đơn của bàn mình
        if (sessionToken != null && !sessionToken.isBlank()) {
            return orderService.getOrdersBySession(sessionToken);
        }

        // 2. Nếu là khách hàng thành viên đăng nhập: xem lịch sử đơn hàng của mình
        boolean isStaff = (staffKey != null && !staffKey.isBlank() && staffKey.trim().equals(configuredStaffKey.trim()))
                || SecurityUtils.hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF");
        Optional<String> customerIdOpt = SecurityUtils.getCurrentCustomerIdOptional();
        if (!isStaff && customerIdOpt.isPresent()) {
            return orderService.getOrdersByCustomer(customerIdOpt.get());
        }

        // 3. Nếu muốn xem toàn bộ đơn nhà hàng: bắt buộc phải có quyền nhân viên
        checkStaffAccess(staffKey);
        return orderService.getAllOrders(status);
    }

    @GetMapping("/{id}")
    public OrderResponse getOrderById(
            @PathVariable String id,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        OrderResponse order = orderService.getOrderById(id);

        // 1. Nhân viên có khóa hợp lệ hoặc có quyền STAFF/ADMIN
        boolean isStaff = (staffKey != null && !staffKey.isBlank() && staffKey.trim().equals(configuredStaffKey.trim()))
                || SecurityUtils.hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF");
        if (isStaff) {
            return order;
        }

        // 2. Khách hàng tại bàn sở hữu phiên của đơn hàng
        if (sessionToken != null && !sessionToken.isBlank()) {
            String trimmedToken = sessionToken.trim();
            // TH 2a: sessionToken trùng trực tiếp với tableSessionId
            if (trimmedToken.equals(order.getTableSessionId())) {
                return order;
            }
            // TH 2b: Tra cứu phiên bàn qua sessionToken trong CSDL
            Optional<TableSessionEntity> sessionOpt = tableSessionRepository.findBySessionToken(trimmedToken);
            if (sessionOpt.isPresent() && sessionOpt.get().getId().equals(order.getTableSessionId())) {
                return order;
            }
            // Nếu khách truyền sessionToken nhưng không thuộc về đơn hàng này
            throw new AccessDeniedException("Truy cập bị từ chối: Phiên bàn hiện tại không sở hữu đơn hàng này!");
        }

        // 3. Khách hàng thành viên sở hữu đơn hàng
        Optional<String> customerIdOpt = SecurityUtils.getCurrentCustomerIdOptional();
        if (customerIdOpt.isPresent() && order.getCustomerId() != null) {
            if (customerIdOpt.get().equals(order.getCustomerId())) {
                return order;
            }
            throw new AccessDeniedException("Truy cập bị từ chối: Đơn hàng này thuộc về một tài khoản khác!");
        }

        // 4. Khách vãng lai tra cứu đơn hàng của mình khi nắm giữ ID/mã đơn hàng hợp lệ
        // (Áp dụng cho đơn vãng lai mang về / giao hàng hoặc đơn không gắn tài khoản thành viên)
        if (order.getCustomerId() == null) {
            return order;
        }

        throw new AccessDeniedException("Truy cập bị từ chối: Bạn không có quyền xem thông tin đơn hàng này!");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return orderService.createOrder(request, sessionToken, idempotencyKey);
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status,
            @RequestParam(required = false, defaultValue = "false") boolean autoPay,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        return orderService.updateOrderStatus(id, status, autoPay);
    }

    @PostMapping("/{id}/confirm-payment")
    public OrderResponse confirmOrderPayment(
            @PathVariable String id,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) BigDecimal amountReceived,
            @RequestParam(required = false, defaultValue = "false") boolean autoComplete,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey,
            @RequestHeader(value = "X-Staff-Id", required = false) String staffId
    ) {
        checkStaffAccess(staffKey);
        PaymentMethod paymentMethod = method != null && !method.isBlank() ? PaymentMethod.fromString(method) : null;
        return orderService.confirmOrderPayment(id, paymentMethod, amountReceived, autoComplete, staffId);
    }

    @PatchMapping("/{orderId}/items/{itemId}/status")
    public OrderResponse updateOrderItemStatus(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam OrderItemStatus status,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        return orderService.updateOrderItemStatus(itemId, status);
    }

    @PostMapping("/{orderId}/items/{itemId}/cancel")
    public OrderResponse cancelOrderItem(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam(required = false, defaultValue = "Khách yêu cầu hủy món") String reason,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey,
            @RequestHeader(value = "X-Staff-Id", required = false) String staffId
    ) {
        checkStaffAccess(staffKey);
        return orderService.cancelOrderItem(orderId, itemId, reason, staffId);
    }
}
