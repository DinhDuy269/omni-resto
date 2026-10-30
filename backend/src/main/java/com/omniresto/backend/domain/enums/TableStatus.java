package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum TableStatus {
    available,
    occupied,
    reserved,
    cleaning;

    @JsonCreator
    public static TableStatus fromString(String value) {
        if (value == null) return available;
        for (TableStatus s : values()) {
            if (s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        return available;
    }
}
