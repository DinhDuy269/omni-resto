package com.omniresto.backend.domain;

import com.omniresto.backend.domain.enums.RedemptionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "voucher_redemptions",
        uniqueConstraints = {
                // Ràng buộc chống Race Condition per-user tuyệt đối ở tầng cơ sở dữ liệu
                @UniqueConstraint(name = "uk_voucher_cust_seq", columnNames = {"voucher_id", "customer_id", "usage_sequence"})
        },
        indexes = {
                @Index(name = "idx_redemption_order", columnList = "order_id"),
                @Index(name = "idx_redemption_lookup", columnList = "voucher_id, customer_id, status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherRedemptionEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "voucher_id", nullable = false, length = 36)
    private String voucherId;

    @Column(name = "customer_id", nullable = false, length = 36)
    private String customerId;

    @Column(name = "order_id", nullable = false, length = 36)
    private String orderId;

    @Column(name = "usage_sequence", nullable = false)
    private Integer usageSequence; // Thứ tự lượt dùng của khách hàng (1, 2, ...)

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "redeemed_at", nullable = false)
    private LocalDateTime redeemedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RedemptionStatus status = RedemptionStatus.applied;
}
