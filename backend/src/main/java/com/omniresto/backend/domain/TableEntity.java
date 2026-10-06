package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.TableStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableEntity extends BaseEntity {


    @Column(name = "table_no", nullable = false, length = 30)
    private String tableNo;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TableStatus status = TableStatus.available;

    @Column(name = "current_order_id", length = 36)
    private String currentOrderId;

    @Column(name = "qr_secret_token", unique = true, length = 64)
    private String qrSecretToken;
}
