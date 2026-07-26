package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "branch_menu_items", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"branch_id", "menu_item_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchMenuItemEntity extends BaseEntity {

    @Column(name = "branch_id", nullable = false, length = 36)
    private String branchId;

    @Column(name = "menu_item_id", nullable = false, length = 36)
    private String menuItemId;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;

    @Column(name = "custom_price", precision = 12, scale = 2)
    private BigDecimal customPrice;
}
