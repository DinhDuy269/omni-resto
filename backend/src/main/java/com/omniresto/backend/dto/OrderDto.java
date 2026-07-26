package com.omniresto.backend.dto;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentMethod;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDto {
    private String id;
    private String orderNumber;
    private String branchId;
    private String branchName;
    private String tableId;
    private String tableNo;
    private OrderType orderType;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String customerName;
    private PaymentMethod paymentMethod;
    private LocalDateTime createdAt;
    private List<OrderItemDto> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemDto {
        private String id;
        private String menuItemId;
        private String itemName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private String notes;
    }
}
