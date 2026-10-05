package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.PaymentTransactionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionEntity extends BaseEntity {

    @Column(name = "order_id", nullable = false, length = 36)
    private String orderId;

    @Column(name = "transaction_reference", nullable = false, unique = true, length = 100)
    private String transactionReference;

    @Column(name = "amount_expected", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountExpected;

    @Column(name = "amount_received", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountReceived;

    @Column(name = "payment_gateway", nullable = false, length = 30)
    @Builder.Default
    private String paymentGateway = "VIETQR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentTransactionStatus status = PaymentTransactionStatus.success;

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;
}
