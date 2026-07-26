package com.omniresto.backend.service;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.dto.OrderDto;
import com.omniresto.backend.repository.BranchRepository;
import com.omniresto.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final BranchRepository branchRepository;

    public List<OrderDto> getAllOrders(String branchId, OrderStatus status) {
        List<OrderEntity> orders;

        if (branchId != null && !branchId.isBlank() && !"ALL".equalsIgnoreCase(branchId)) {
            if (status != null) {
                orders = orderRepository.findByBranchIdAndStatus(branchId, status);
            } else {
                orders = orderRepository.findByBranchId(branchId);
            }
        } else {
            if (status != null) {
                orders = orderRepository.findByStatus(status);
            } else {
                orders = orderRepository.findAll();
            }
        }

        return orders.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public OrderDto getOrderById(String id) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        return mapToDto(entity);
    }

    public OrderDto createOrder(OrderDto dto) {
        String generatedNumber = "ORD-" + System.currentTimeMillis() % 100000;

        OrderEntity entity = OrderEntity.builder()
                .orderNumber(dto.getOrderNumber() != null ? dto.getOrderNumber() : generatedNumber)
                .branchId(dto.getBranchId())
                .tableId(dto.getTableId())
                .tableNo(dto.getTableNo())
                .orderType(dto.getOrderType())
                .status(OrderStatus.pending)
                .customerName(dto.getCustomerName())
                .paymentMethod(dto.getPaymentMethod())
                .totalAmount(BigDecimal.ZERO)
                .build();

        if (dto.getItems() != null) {
            BigDecimal calculatedTotal = BigDecimal.ZERO;
            for (OrderDto.OrderItemDto itemDto : dto.getItems()) {
                BigDecimal lineTotal = itemDto.getUnitPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
                calculatedTotal = calculatedTotal.add(lineTotal);

                OrderItemEntity itemEntity = OrderItemEntity.builder()
                        .menuItemId(itemDto.getMenuItemId() != null ? itemDto.getMenuItemId() : UUID.randomUUID().toString())
                        .itemName(itemDto.getItemName())
                        .quantity(itemDto.getQuantity())
                        .unitPrice(itemDto.getUnitPrice())
                        .notes(itemDto.getNotes())
                        .build();

                entity.addItem(itemEntity);
            }
            entity.setTotalAmount(calculatedTotal);
        }

        return mapToDto(orderRepository.save(entity));
    }

    public OrderDto updateOrderStatus(String id, OrderStatus status) {
        OrderEntity entity = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        entity.setStatus(status);
        return mapToDto(orderRepository.save(entity));
    }

    private OrderDto mapToDto(OrderEntity entity) {
        String branchName = "Trụ sở HQ";
        if (entity.getBranchId() != null) {
            branchName = branchRepository.findById(entity.getBranchId())
                    .map(BranchEntity::getName)
                    .orElse("Chi nhánh " + entity.getBranchId());
        }

        List<OrderDto.OrderItemDto> itemDtos = entity.getItems().stream().map(i ->
                OrderDto.OrderItemDto.builder()
                        .id(i.getId())
                        .menuItemId(i.getMenuItemId())
                        .itemName(i.getItemName())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .notes(i.getNotes())
                        .build()
        ).collect(Collectors.toList());

        return OrderDto.builder()
                .id(entity.getId())
                .orderNumber(entity.getOrderNumber())
                .branchId(entity.getBranchId())
                .branchName(branchName)
                .tableId(entity.getTableId())
                .tableNo(entity.getTableNo())
                .orderType(entity.getOrderType())
                .status(entity.getStatus())
                .totalAmount(entity.getTotalAmount())
                .customerName(entity.getCustomerName())
                .paymentMethod(entity.getPaymentMethod())
                .createdAt(entity.getCreatedAt())
                .items(itemDtos)
                .build();
    }
}
