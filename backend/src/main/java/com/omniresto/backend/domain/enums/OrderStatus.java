package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrderStatus {
    pending,
    confirmed,
    preparing,
    ready,
    completed,
    cancelled;

    @JsonCreator
    public static OrderStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (OrderStatus status : OrderStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái đơn hàng không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
