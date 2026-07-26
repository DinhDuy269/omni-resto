package com.omniresto.backend.model.menu.request;

import com.omniresto.backend.domain.enums.MenuStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class MenuItemRequest {
    private String code;
    private String name;
    private String categoryId;
    private String categoryName;
    private BigDecimal basePrice;
    private String description;
    private MenuStatus status;
    private Boolean isBestSeller;
    private String image;
    private String imageUrl;
}
