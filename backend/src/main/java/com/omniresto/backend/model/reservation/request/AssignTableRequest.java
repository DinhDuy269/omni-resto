package com.omniresto.backend.model.reservation.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AssignTableRequest {

    @NotEmpty(message = "Vui lòng chọn ít nhất một bàn")
    @JsonProperty("table_ids")
    @JsonAlias({"tableIds", "table_id", "tableId"})
    private List<String> tableIds;
}