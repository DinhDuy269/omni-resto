package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "menu_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String ingredients;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MenuStatus status = MenuStatus.available;

    @Column(name = "is_best_seller")
    @Builder.Default
    private Boolean isBestSeller = false;

    @Column(name = "meal_periods", length = 100)
    @Builder.Default
    private String mealPeriods = "MORNING,NOON,EVENING";

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_vegetarian")
    @Builder.Default
    private Boolean isVegetarian = false;

    @Column(name = "spicy_level")
    @Builder.Default
    private Integer spicyLevel = 0;

    @Column(name = "allergens", length = 255)
    private String allergens;

    @Column(name = "allergen_verified")
    @Builder.Default
    private Boolean allergenVerified = false;

    @Column(name = "spicy_verified")
    @Builder.Default
    private Boolean spicyVerified = false;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_at")
    private java.time.LocalDateTime verifiedAt;

    public BigDecimal getPrice() {
        return basePrice;
    }

    public void setPrice(BigDecimal price) {
        this.basePrice = price;
    }
}
