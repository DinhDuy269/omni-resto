package com.omniresto.backend.dto;

import com.omniresto.backend.domain.enums.MenuStatus;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemDto {
    private String id;
    private String code;
    private String name;
    private String categoryId;
    private String categoryName;
    private BigDecimal basePrice;
    private String description;
    private MenuStatus status;
    private Boolean isBestSeller;
    private String imageUrl;
}
