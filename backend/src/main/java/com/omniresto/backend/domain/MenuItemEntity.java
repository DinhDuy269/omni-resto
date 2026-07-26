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

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MenuStatus status = MenuStatus.available;

    @Column(name = "is_best_seller")
    @Builder.Default
    private Boolean isBestSeller = false;

    @Column(name = "image_url", length = 500)
    private String imageUrl;
}
