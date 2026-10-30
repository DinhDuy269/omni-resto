package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum DiscountType {
    percentage,      // Giảm theo phần trăm (VD: 20%)
    fixed_amount;    // Giảm tiền mặt cố định (VD: 50.000đ)

    @JsonCreator
    public static DiscountType fromString(String value) {
        if (value == null) return percentage;
        for (DiscountType t : values()) {
            if (t.name().equalsIgnoreCase(value.trim())) {
                return t;
            }
        }
        return percentage;
    }
}
