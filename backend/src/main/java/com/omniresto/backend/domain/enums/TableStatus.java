package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TableStatus {
    available,
    occupied,
    reserved,
    cleaning;

    @JsonCreator
    public static TableStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (TableStatus status : TableStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái bàn không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
