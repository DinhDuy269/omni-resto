package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum MembershipTier {
    standard,
    silver,
    gold,
    platinum;

    @JsonCreator
    public static MembershipTier fromString(String value) {
        if (value == null) return standard;
        for (MembershipTier t : values()) {
            if (t.name().equalsIgnoreCase(value.trim())) {
                return t;
            }
        }
        return standard;
    }
}