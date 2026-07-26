package com.omniresto.backend.model.order.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class OrderItemRequest {
    private String menuItemId;
    private String name;
    private Integer quantity;
    private BigDecimal price;
    private String notes;
}
