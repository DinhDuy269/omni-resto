package com.omniresto.backend.model.servicerequest;

import com.omniresto.backend.domain.enums.ServiceRequestType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequestCreateRequest {

    @NotNull(message = "Loại yêu cầu phục vụ không được để trống!")
    private ServiceRequestType requestType;

    private String note;
}
