package com.omniresto.backend.model.voucher.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.omniresto.backend.domain.enums.DiscountType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class VoucherRequest {
    private String code;
    private String name;
    private String description;

    @JsonAlias({"discountType", "discount_type"})
    private DiscountType discountType;

    @JsonAlias({"discountValue", "discount_value"})
    private BigDecimal discountValue;

    @JsonAlias({"maxDiscountAmount", "max_discount_amount"})
    private BigDecimal maxDiscountAmount;

    @JsonAlias({"minOrderAmount", "min_order_amount"})
    private BigDecimal minOrderAmount;

    @JsonAlias({"totalQuantity", "total_quantity"})
    private Integer totalQuantity;

    @JsonAlias({"usageLimitPerUser", "usage_limit_per_user"})
    private Integer usageLimitPerUser;

    @JsonAlias({"startDate", "start_date"})
    private LocalDateTime startDate;

    @JsonAlias({"endDate", "end_date"})
    private LocalDateTime endDate;

    @JsonAlias({"isWelcomeVoucher", "is_welcome_voucher"})
    private Boolean isWelcomeVoucher;
}