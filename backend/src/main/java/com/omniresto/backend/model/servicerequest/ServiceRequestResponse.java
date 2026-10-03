package com.omniresto.backend.model.servicerequest;

import com.omniresto.backend.domain.enums.ServiceRequestStatus;
import com.omniresto.backend.domain.enums.ServiceRequestType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequestResponse {

    private String id;
    private String tableSessionId;
    private String tableId;
    private String tableNo;
    private ServiceRequestType requestType;
    private String note;
    private ServiceRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolvedByStaffId;
}
