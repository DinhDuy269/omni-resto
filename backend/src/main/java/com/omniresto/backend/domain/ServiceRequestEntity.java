package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import com.omniresto.backend.domain.enums.ServiceRequestStatus;
import com.omniresto.backend.domain.enums.ServiceRequestType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceRequestEntity extends BaseEntity {

    @Column(name = "table_session_id", nullable = false, length = 36)
    private String tableSessionId;

    @Column(name = "table_id", nullable = false, length = 36)
    private String tableId;

    @Column(name = "table_no", nullable = false, length = 30)
    private String tableNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private ServiceRequestType requestType;

    @Column(length = 255)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ServiceRequestStatus status = ServiceRequestStatus.pending;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by_staff_id", length = 36)
    private String resolvedByStaffId;
}
