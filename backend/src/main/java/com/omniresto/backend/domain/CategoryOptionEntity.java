package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.OptionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "category_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryOptionEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false, length = 20)
    @Builder.Default
    private OptionType optionType = OptionType.topping;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;
}
