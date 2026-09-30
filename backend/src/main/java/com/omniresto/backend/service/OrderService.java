package com.omniresto.backend.service;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderEventMessage;
import com.omniresto.backend.model.order.response.OrderItemResponse;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final com.omniresto.backend.repository.MenuItemRepository menuItemRepository;
    private final SimpMessagingTemplate messagingTemplate;

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
        // ── Kiểm tra thời gian phục vụ của các món theo buổi ────────────────
        java.time.LocalTime now = java.time.LocalTime.now();
        com.omniresto.backend.domain.enums.MealPeriod currentPeriod = com.omniresto.backend.domain.enums.MealPeriod.getCurrentPeriod(now);

        if (currentPeriod == com.omniresto.backend.domain.enums.MealPeriod.CLOSED) {
            throw new com.omniresto.backend.exception.BadRequestException(
                    "Nhà hàng hiện đang trong giờ đóng cửa (22:00 - 06:00). Quý khách vui lòng đặt món vào ca Sáng từ 06:00!"
            );
        }

        if (request.getItems() != null) {
            for (var itemReq : request.getItems()) {
                if (itemReq.getMenuItemId() != null) {
                    var menuItemOpt = menuItemRepository.findById(itemReq.getMenuItemId());
                    if (menuItemOpt.isPresent()) {
                        var menuItem = menuItemOpt.get();
                        if (!com.omniresto.backend.domain.enums.MealPeriod.isAvailableNow(menuItem.getMealPeriods(), now)) {
                            String periodDesc = com.omniresto.backend.domain.enums.MealPeriod.getPeriodDescription(menuItem.getMealPeriods());
                            throw new com.omniresto.backend.exception.BadRequestException(
                                    "Món '" + menuItem.getName() + "' chỉ phục vụ vào: " + periodDesc
                                    + ". Hiện tại đã hết thời gian phục vụ của món này (" + currentPeriod.getDisplayName()
                                    + "), quý khách vui lòng chọn các món thuộc thực đơn hiện tại!"
                            );
                        }
                    }
                }
            }
        }

        String orderId = "ord-" + UUID.randomUUID().toString().substring(0, 8);
        String orderNum = "ORD-" + (System.currentTimeMillis() % 100000);

        OrderEntity entity = OrderEntity.builder()
                .orderNumber(orderNum)
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

    @Transactional
    public OrderResponse updateOrderStatus(String id, OrderStatus status) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
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
            return res;
        }).collect(Collectors.toList());

        OrderResponse res = new OrderResponse();
        res.setId(entity.getId());
        res.setOrderNumber(entity.getOrderNumber());
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
