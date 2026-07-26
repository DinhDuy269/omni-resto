package com.omniresto.backend.model.branch.request;

import com.omniresto.backend.domain.enums.BranchStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BranchRequest {
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
