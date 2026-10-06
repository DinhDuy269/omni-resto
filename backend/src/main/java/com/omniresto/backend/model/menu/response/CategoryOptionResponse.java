package com.omniresto.backend.model.menu.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryOptionResponse {
    private String id;
    private String categoryId;
    private String name;
    private String optionType; // "SIZE" | "TOPPING"
    private BigDecimal price;
    private String status;
    private Integer displayOrder;
}
