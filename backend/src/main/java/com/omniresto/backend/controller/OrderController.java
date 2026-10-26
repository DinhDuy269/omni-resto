package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OrderItemStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.service.OrderService;
import com.omniresto.backend.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Value("${omniresto.security.staff-key:STAFF_SECRET_KEY}")
    private String configuredStaffKey;

    private void checkStaffAccess(String staffKey) {
        if (staffKey == null || staffKey.isBlank() || !staffKey.trim().equals(configuredStaffKey.trim())) {
            throw new AccessDeniedException("Truy cập bị từ chối: Thao tác này chỉ dành cho nhân viên có thẩm quyền!");
        }
    }

    @GetMapping
    public List<OrderResponse> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        // Nếu là khách tại bàn: chỉ cho phép xem đơn của bàn mình
        if (sessionToken != null && !sessionToken.isBlank()) {
            return orderService.getOrdersBySession(sessionToken);
        }

        // Nếu muốn xem toàn bộ đơn nhà hàng: bắt buộc phải có khóa nhân viên
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
        if (sessionToken != null && !sessionToken.isBlank() && sessionToken.equals(order.getTableSessionId())) {
            return order;
        }

        // 3. Khách hàng thành viên sở hữu đơn hàng
        Optional<String> customerIdOpt = SecurityUtils.getCurrentCustomerIdOptional();
        if (customerIdOpt.isPresent() && customerIdOpt.get().equals(order.getCustomerId())) {
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
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        return orderService.updateOrderStatus(id, status);
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
