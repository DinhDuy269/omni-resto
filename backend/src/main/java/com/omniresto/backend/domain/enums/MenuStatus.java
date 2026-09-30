package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MenuStatus {
    available,
    out_of_stock,
    discontinued;

    @JsonCreator
    public static MenuStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        if ("unavailable".equals(val)) {
            return out_of_stock;
        }
        for (MenuStatus status : MenuStatus.values()) {
            if (status.name().equalsIgnoreCase(val)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái món không hợp lệ: " + value + ". Các giá trị hợp lệ: available, out_of_stock, discontinued");
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
