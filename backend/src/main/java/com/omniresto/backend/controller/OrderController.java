package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.dto.OrderDto;
import com.omniresto.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderDto>> getAllOrders(
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.getAllOrders(branchId, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getOrderById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(@RequestBody OrderDto dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderDto> updateOrderStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }
}
