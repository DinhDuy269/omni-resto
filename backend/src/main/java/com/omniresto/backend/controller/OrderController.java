package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OrderItemStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public List<OrderResponse> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String branchId
    ) {
        return orderService.getAllOrders(status);
    }

    @GetMapping("/{id}")
    public OrderResponse getOrderById(@PathVariable String id) {
        return orderService.getOrderById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken
    ) {
        return orderService.createOrder(request, sessionToken);
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status
    ) {
        return orderService.updateOrderStatus(id, status);
    }

    @PatchMapping("/{orderId}/items/{itemId}/status")
    public OrderResponse updateOrderItemStatus(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam OrderItemStatus status
    ) {
        return orderService.updateOrderItemStatus(itemId, status);
    }

    @PostMapping("/{orderId}/items/{itemId}/cancel")
    public OrderResponse cancelOrderItem(
            @PathVariable String orderId,
            @PathVariable String itemId,
            @RequestParam(required = false, defaultValue = "Khách yêu cầu hủy món") String reason,
            @RequestHeader(value = "X-Staff-Id", required = false) String staffId
    ) {
        return orderService.cancelOrderItem(orderId, itemId, reason, staffId);
    }
}
