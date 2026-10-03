package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrderItemStatus {
    pending,
    confirmed,
    preparing,
    ready,
    served,
    cancelled;

    @JsonCreator
    public static OrderItemStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (OrderItemStatus status : OrderItemStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái món không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
