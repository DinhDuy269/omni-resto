package com.omniresto.backend.model.menu.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.MenuStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@JsonRootName("menu_item")
public class MenuItemResponse {
    private String id;
    private String code;
    private String name;
    private String categoryId;
    private String category;
    private BigDecimal basePrice;
    private BigDecimal price;
    private String description;
    private String ingredients;
    private MenuStatus status;
    private Boolean isBestSeller;
    private String mealPeriods;
    private Boolean isAvailableNow;
    private String mealPeriodNote;
    private String image;
    private String imageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
