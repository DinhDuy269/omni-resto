package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum OrderStatus {
    pending,
    confirmed,
    preparing,
    ready,
    completed,
    cancelled;

    @JsonCreator
    public static OrderStatus fromString(String value) {
        if (value == null) return pending;
        for (OrderStatus s : values()) {
            if (s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        return pending;
    }
}
