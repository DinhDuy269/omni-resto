package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentMethod {
    cash,
    card,
    qr_code,
    vnpay,
    vnpay_qr;

    @JsonCreator
    public static PaymentMethod fromString(String value) {
        if (value == null) return cash;
        for (PaymentMethod m : values()) {
            if (m.name().equalsIgnoreCase(value.trim())) {
                return m;
            }
        }
        return cash;
    }
}
