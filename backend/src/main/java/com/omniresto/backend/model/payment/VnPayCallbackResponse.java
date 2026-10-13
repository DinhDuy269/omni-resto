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
public class VnPayCallbackResponse {

    @JsonProperty("is_success")
    private boolean isSuccess;

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("order_number")
    private String orderNumber;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("transaction_no")
    private String transactionNo;

    @JsonProperty("txn_ref")
    private String txnRef;

    @JsonProperty("response_code")
    private String responseCode;

    @JsonProperty("message")
    private String message;
}
