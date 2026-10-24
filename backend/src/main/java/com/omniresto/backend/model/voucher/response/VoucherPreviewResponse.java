package com.omniresto.backend.model.voucher.response;

import com.omniresto.backend.domain.enums.DiscountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherPreviewResponse {

    private String code;
    private String voucherName;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private String message;
}
