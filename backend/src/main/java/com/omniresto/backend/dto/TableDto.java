package com.omniresto.backend.dto;

import com.omniresto.backend.domain.enums.TableStatus;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableDto {
    private String id;
    private String branchId;
    private String tableNo;
    private Integer capacity;
    private TableStatus status;
    private String currentOrderId;
    private BigDecimal currentOrderAmount;
}
