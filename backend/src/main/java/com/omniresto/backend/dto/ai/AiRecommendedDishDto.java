package com.omniresto.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiRecommendedDishDto {
    private String id;
    private String code;
    private String name;
    private String category;
    private BigDecimal price;
    private String description;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("is_vegetarian")
    private Boolean isVegetarian;

    @JsonProperty("spicy_level")
    private Integer spicyLevel;

    private String allergens;

    @JsonProperty("allergen_verified")
    private Boolean allergenVerified;

    @JsonProperty("spicy_verified")
    private Boolean spicyVerified;

    @JsonProperty("meal_periods")
    private String mealPeriods;

    @JsonProperty("available_now")
    private Boolean availableNow;

    @JsonProperty("meal_period_note")
    private String mealPeriodNote;
}
