package com.omniresto.backend.model.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.TableStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@JsonRootName("table")
public class TableResponse {
    private String id;
    private String tableNo;
    private Integer capacity;
    private TableStatus status;
    private BigDecimal currentOrderAmount;
    private String occupiedSince;
}
