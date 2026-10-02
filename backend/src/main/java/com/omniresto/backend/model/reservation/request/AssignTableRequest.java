package com.omniresto.backend.model.reservation.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignTableRequest {

    @NotBlank(message = "Vui lòng chọn bàn cần gán")
    private String tableId;
}