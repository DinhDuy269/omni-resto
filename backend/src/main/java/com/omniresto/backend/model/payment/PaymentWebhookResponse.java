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
public class PaymentWebhookResponse {
    private boolean success;
    private String message;

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("order_number")
    private String orderNumber;

    @JsonProperty("table_no")
    private String tableNo;

    @JsonProperty("transaction_reference")
    private String transactionReference;

    @JsonProperty("amount_received")
    private BigDecimal amountReceived;

    private String status; // "PAID", "UNDERPAID", "OVERPAID", "DUPLICATE"
}
