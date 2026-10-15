package com.omniresto.backend.model.reservation.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AssignTableRequest {

    @NotEmpty(message = "Vui lòng chọn ít nhất một bàn")
    private List<String> tableIds;
}