package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum OtpPurpose {
    register_verification,
    password_reset;

    @JsonCreator
    public static OtpPurpose fromString(String value) {
        if (value == null) return register_verification;
        for (OtpPurpose p : values()) {
            if (p.name().equalsIgnoreCase(value.trim())) {
                return p;
            }
        }
        return register_verification;
    }
}
