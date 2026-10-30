package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum VoucherStatus {
    active,
    inactive,
    expired;

    @JsonCreator
    public static VoucherStatus fromString(String value) {
        if (value == null) return active;
        for (VoucherStatus s : values()) {
            if (s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        return active;
    }
}
