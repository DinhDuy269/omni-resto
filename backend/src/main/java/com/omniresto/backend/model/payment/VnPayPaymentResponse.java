package com.omniresto.backend.model.payment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayPaymentResponse {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("order_number")
    private String orderNumber;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("payment_url")
    private String paymentUrl;

    @JsonProperty("qr_image_url")
    private String qrImageUrl;

    @JsonProperty("txn_ref")
    private String txnRef;

    @JsonProperty("bank_code")
    private String bankCode;

    @JsonProperty("message")
    private String message;
}
