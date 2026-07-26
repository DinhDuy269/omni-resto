package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.BranchStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "manager_name", length = 100)
    private String managerName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BranchStatus status = BranchStatus.active;

    @Column(name = "tables_count", nullable = false)
    @Builder.Default
    private Integer tablesCount = 0;

    @Column(name = "daily_revenue", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal dailyRevenue = BigDecimal.ZERO;

    @Builder.Default
    private Double rating = 5.0;
}
