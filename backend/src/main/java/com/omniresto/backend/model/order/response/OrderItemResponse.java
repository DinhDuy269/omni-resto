package com.omniresto.backend.model.order.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.OrderItemStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@JsonRootName("order_item")
public class OrderItemResponse {
    private String id;
    private String menuItemId;
    private String name;
    private Integer quantity;
    private BigDecimal price;
    private String notes;
    private Integer roundNo;
    private OrderItemStatus status;
    private LocalDateTime addedAt;
    private String confirmedByStaffId;
    private LocalDateTime confirmedAt;
    private java.util.List<OrderItemOptionResponse> options = new java.util.ArrayList<>();
}

