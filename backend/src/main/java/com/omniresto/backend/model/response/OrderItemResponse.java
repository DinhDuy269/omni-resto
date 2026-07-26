package com.omniresto.backend.model.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

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
}
