package com.omniresto.backend.model.menu.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.domain.enums.MenuStatus;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class MenuItemUpdateRequest {

    private String code;
    private String name;
    private String categoryId;
    private String categoryName;

    @DecimalMin(value = "0.0", inclusive = true, message = "Giá món ăn không được âm")
    private BigDecimal basePrice;

    @DecimalMin(value = "0.0", inclusive = true, message = "Giá món ăn không được âm")
    private BigDecimal price;

    private String description;
    private String ingredients;
    private String mealPeriods;
    private MenuStatus status;
    private Boolean isBestSeller;
    private String image;
    private String imageUrl;

    @JsonProperty("menu_item")
    private MenuItemUpdateRequest menuItem;

    public MenuItemUpdateRequest getActual() {
        return menuItem != null ? menuItem : this;
    }

    public BigDecimal getEffectivePrice() {
        MenuItemUpdateRequest target = getActual();
        if (target.basePrice != null) {
            return target.basePrice;
        }
        return target.price;
    }

    public String getEffectiveImageUrl() {
        MenuItemUpdateRequest target = getActual();
        if (target.imageUrl != null && !target.imageUrl.isBlank()) {
            return target.imageUrl;
        }
        return target.image;
    }
}
