package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.OptionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_item_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemOptionEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItemEntity orderItem;

    @Column(name = "option_id", nullable = false, length = 36)
    private String optionId;

    @Column(name = "option_name", nullable = false, length = 100)
    private String optionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false, length = 20)
    @Builder.Default
    private OptionType optionType = OptionType.topping;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @PrePersist
    public void initId() {
        if (this.getId() == null || this.getId().isBlank()) {
            this.setId("ito-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
        }
    }
}
