package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum CustomerStatus {
    active,
    inactive;

    @JsonCreator
    public static CustomerStatus fromString(String value) {
        if (value == null) return active;
        for (CustomerStatus s : values()) {
            if (s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        return active;
    }
}
