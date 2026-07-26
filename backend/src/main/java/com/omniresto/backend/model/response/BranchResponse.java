package com.omniresto.backend.model.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.BranchStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@JsonRootName("branch")
public class BranchResponse {
    private String id;
    private String code;
    private String name;
    private String address;
    private String phone;
    private String managerName;
    private BranchStatus status;
    private Integer tablesCount;
    private Integer activeOrdersCount;
    private BigDecimal dailyRevenue;
    private Double rating;
    private LocalDateTime createdAt;
}
