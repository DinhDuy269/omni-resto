package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EventStatus {
    upcoming,
    ongoing,
    completed,
    cancelled;

    @JsonCreator
    public static EventStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (EventStatus status : EventStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái sự kiện không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
