package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String branchId
    ) {
        return ResponseEntity.ok(orderService.getAllOrders(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request, sessionToken));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @PatchMapping("/{orderId}/items/{itemId}/status")
    public ResponseEntity<OrderResponse> updateOrderItemStatus(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam com.omniresto.backend.domain.enums.OrderItemStatus status
    ) {
        return ResponseEntity.ok(orderService.updateOrderItemStatus(itemId, status));
    }

    @PostMapping("/{orderId}/items/{itemId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrderItem(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam(required = false, defaultValue = "Khách yêu cầu hủy món") String reason,
            @RequestHeader(value = "X-Staff-Id", required = false) String staffId
    ) {
        return ResponseEntity.ok(orderService.cancelOrderItem(orderId, itemId, reason, staffId));
    }
}
