package com.omniresto.backend.model.payment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayProcessPaymentRequest {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("card_number")
    private String cardNumber;

    @JsonProperty("card_holder")
    private String cardHolder;

    @JsonProperty("payment_date")
    private String paymentDate;

    @JsonProperty("otp")
    private String otp;
}
