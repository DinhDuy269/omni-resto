package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum OrderType {
    dine_in,
    takeaway,
    delivery;

    @JsonCreator
    public static OrderType fromString(String value) {
        if (value == null) return dine_in;
        for (OrderType t : values()) {
            if (t.name().equalsIgnoreCase(value.trim())) {
                return t;
            }
        }
        return dine_in;
    }
}
