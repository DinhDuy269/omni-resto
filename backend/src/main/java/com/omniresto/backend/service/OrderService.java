package com.omniresto.backend.service;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderItemResponse;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.omniresto.backend.model.order.response.OrderEventMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<OrderResponse> getAllOrders(String branchId, OrderStatus status) {
        List<OrderEntity> orders;
        if (branchId != null && !branchId.equals("ALL")) {
            orders = orderRepository.findByBranchId(branchId);
        } else {
            orders = orderRepository.findAll();
        }

        if (status != null) {
            orders = orders.stream()
                    .filter(o -> o.getStatus() == status)
                    .collect(Collectors.toList());
        }

        return orders.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public OrderResponse getOrderById(String id) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        String orderId = "ord-" + UUID.randomUUID().toString().substring(0, 8);
        String orderNum = "ORD-" + (System.currentTimeMillis() % 100000);

        OrderEntity entity = OrderEntity.builder()
                .orderNumber(orderNum)
                .branchId(request.getBranchId() != null ? request.getBranchId() : "br-01")
                .orderType(request.getOrderType())
                .tableNo(request.getTableNo())
                .status(request.getStatus() != null ? request.getStatus() : OrderStatus.pending)
                .totalAmount(request.getTotalAmount())
                .paymentMethod(request.getPaymentMethod())
                .customerName(request.getCustomerName())
                .build();
        entity.setId(orderId);

        OrderEntity saved = orderRepository.save(entity);

        List<OrderItemEntity> itemEntities = new ArrayList<>();
        if (request.getItems() != null) {
            request.getItems().forEach(itemReq -> {
                OrderItemEntity item = OrderItemEntity.builder()
                        .order(saved)
                        .menuItemId(itemReq.getMenuItemId())
                        .itemName(itemReq.getName() != null ? itemReq.getName() : "Món Ăn Special")
                        .quantity(itemReq.getQuantity())
                        .unitPrice(itemReq.getPrice())
                        .notes(itemReq.getNotes())
                        .build();
                item.setId("item-" + UUID.randomUUID().toString().substring(0, 8));
                itemEntities.add(orderItemRepository.save(item));
            });
        }

        OrderResponse response = mapToResponseWithItems(saved, itemEntities);

        // Notify WebSockets
        sendWebSocketEvent("ORDER_CREATED", response);

        return response;
    }

    public OrderResponse updateOrderStatus(String id, OrderStatus status) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        entity.setStatus(status);
        OrderEntity updated = orderRepository.save(entity);
        OrderResponse response = mapToResponse(updated);

        // Notify WebSockets
        sendWebSocketEvent("ORDER_STATUS_CHANGED", response);

        return response;
    }

    private void sendWebSocketEvent(String eventType, OrderResponse orderResponse) {
        try {
            OrderEventMessage message = OrderEventMessage.builder()
                    .eventType(eventType)
                    .order(orderResponse)
                    .build();
            messagingTemplate.convertAndSend("/topic/orders", message);
            if (orderResponse.getBranchId() != null) {
                messagingTemplate.convertAndSend("/topic/orders/" + orderResponse.getBranchId(), message);
            }
        } catch (Exception e) {
            // Log error silently without failing business transaction
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
            return res;
        }).collect(Collectors.toList());

        OrderResponse res = new OrderResponse();
        res.setId(entity.getId());
        res.setOrderNumber(entity.getOrderNumber());
        res.setBranchId(entity.getBranchId());
        res.setBranchName("OmniResto - Hoàn Kiếm");
        res.setOrderType(entity.getOrderType());
        res.setTableNo(entity.getTableNo());
        res.setStatus(entity.getStatus());
        res.setTotalAmount(entity.getTotalAmount());
        res.setPaymentMethod(entity.getPaymentMethod());
        res.setCustomerName(entity.getCustomerName());
        res.setItems(itemResponses);
        res.setCreatedAt(entity.getCreatedAt() != null ? entity.getCreatedAt() : LocalDateTime.now());
        return res;
    }
}
