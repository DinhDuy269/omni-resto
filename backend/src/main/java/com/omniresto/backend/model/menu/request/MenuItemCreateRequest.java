package com.omniresto.backend.model.menu.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.domain.enums.MenuStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class MenuItemCreateRequest {

    private String code;

    @NotBlank(message = "Tên món ăn không được để trống")
    private String name;

    @NotBlank(message = "Mã danh mục (categoryId) là bắt buộc")
    private String categoryId;

    private String categoryName;

    @NotNull(message = "Giá món ăn là bắt buộc")
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá món ăn không được âm")
    private BigDecimal basePrice;

    @DecimalMin(value = "0.0", inclusive = true, message = "Giá món ăn không được âm")
    private BigDecimal price;

    private String description;
    private String ingredients;
    private String mealPeriods; // e.g. "MORNING,NOON,EVENING"
    private MenuStatus status;
    private Boolean isBestSeller;
    private String image;
    private String imageUrl;

    // Hỗ trợ trường hợp client bọc payload dạng { "menu_item": { ... } }
    @JsonProperty("menu_item")
    private MenuItemCreateRequest menuItem;

    public MenuItemCreateRequest getActual() {
        return menuItem != null ? menuItem : this;
    }

    public BigDecimal getEffectivePrice() {
        MenuItemCreateRequest target = getActual();
        if (target.basePrice != null) {
            return target.basePrice;
        }
        return target.price;
    }

    public String getEffectiveImageUrl() {
        MenuItemCreateRequest target = getActual();
        if (target.imageUrl != null && !target.imageUrl.isBlank()) {
            return target.imageUrl;
        }
        return target.image;
    }

    public String getEffectiveName() {
        return getActual().name;
    }

    public String getEffectiveCategoryId() {
        return getActual().categoryId;
    }

    public String getEffectiveCode() {
        return getActual().code;
    }

    public String getEffectiveDescription() {
        return getActual().description;
    }

    public String getEffectiveIngredients() {
        return getActual().ingredients;
    }

    public String getEffectiveMealPeriods() {
        return getActual().mealPeriods;
    }

    public MenuStatus getEffectiveStatus() {
        return getActual().status;
    }

    public Boolean getEffectiveIsBestSeller() {
        return getActual().isBestSeller;
    }
}
