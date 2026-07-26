package com.omniresto.backend.model.request;

import com.omniresto.backend.domain.enums.TableStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class TableRequest {
    private String tableNo;
    private String branchId;
    private Integer capacity;
    private TableStatus status;
    private BigDecimal currentOrderAmount;
    private String occupiedSince;
}
