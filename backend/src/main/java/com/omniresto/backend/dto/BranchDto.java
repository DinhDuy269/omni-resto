package com.omniresto.backend.dto;

import com.omniresto.backend.domain.enums.BranchStatus;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchDto {
    private String id;
    private String code;
    private String name;
    private String address;
    private String phone;
    private String managerName;
    private BranchStatus status;
    private Integer tablesCount;
    private BigDecimal dailyRevenue;
    private Double rating;
}
