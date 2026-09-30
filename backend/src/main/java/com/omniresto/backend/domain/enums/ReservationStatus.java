package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ReservationStatus {
    pending,
    confirmed,
    seated,
    completed,
    cancelled,
    no_show;

    @JsonCreator
    public static ReservationStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (ReservationStatus status : ReservationStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái đặt bàn không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
