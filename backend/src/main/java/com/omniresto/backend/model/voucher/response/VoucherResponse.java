package com.omniresto.backend.model.voucher.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.domain.enums.DiscountType;
import com.omniresto.backend.domain.enums.VoucherStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class VoucherResponse {
    private String id;
    private String code;
    private String name;
    private String description;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    private Integer totalQuantity;
    private Integer usedQuantity;
    private Integer usageLimitPerUser;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private VoucherStatus status;
    private Boolean isWelcomeVoucher;
    private LocalDateTime createdAt;
}