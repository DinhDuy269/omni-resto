package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.DiscountType;
import com.omniresto.backend.domain.enums.VoucherStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    private DiscountType discountType;

    // QUAN TRỌNG: Dùng BigDecimal cho tiền tệ, không dùng Double hay Float
    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Builder.Default
    @Column(name = "min_order_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity = 0;

    @Builder.Default
    @Column(name = "used_quantity", nullable = false)
    private Integer usedQuantity = 0;

    @Builder.Default
    @Column(name = "usage_limit_per_user", nullable = false)
    private Integer usageLimitPerUser = 1;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VoucherStatus status = VoucherStatus.active;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "voucher_type", nullable = false, length = 20)
    private com.omniresto.backend.domain.enums.VoucherType voucherType = com.omniresto.backend.domain.enums.VoucherType.general;

    @Builder.Default
    @Column(name = "is_welcome_voucher", nullable = false)
    private Boolean isWelcomeVoucher = false;
}