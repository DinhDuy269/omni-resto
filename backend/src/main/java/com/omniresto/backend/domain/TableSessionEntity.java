package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.TableSessionMode;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "table_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableSessionEntity extends BaseEntity {

    @Column(name = "table_id", nullable = false, length = 36)
    private String tableId;

    @Column(name = "table_no", nullable = false, length = 30)
    private String tableNo;

    @Column(name = "session_token", nullable = false, unique = true, length = 64)
    private String sessionToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TableSessionStatus status = TableSessionStatus.active;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TableSessionMode mode = TableSessionMode.pay_after;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by_staff_id", length = 36)
    private String verifiedByStaffId;

    @Column(name = "last_activity_at", nullable = false)
    @Builder.Default
    private LocalDateTime lastActivityAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public boolean isVerified() {
        return this.verifiedAt != null;
    }
}
