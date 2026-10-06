package com.omniresto.backend.dto.ai;

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
    private String imageUrl;
    private Boolean isVegetarian;
    private Integer spicyLevel;
    private String allergens;
    private Boolean allergenVerified;
    private Boolean spicyVerified;
}
