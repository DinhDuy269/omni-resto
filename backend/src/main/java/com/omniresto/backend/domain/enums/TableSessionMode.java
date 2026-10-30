package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum TableSessionMode {
    pay_after, // Chế độ Trả sau: Gọi món trước, ăn xong nhân viên/khách thanh toán tại quầy
    pay_first; // Chế độ Trả trước: Khách thanh toán online trước thì bếp mới nhận lệnh nấu

    @JsonCreator
    public static TableSessionMode fromString(String value) {
        if (value == null) return pay_after;
        for (TableSessionMode mode : values()) {
            if (mode.name().equalsIgnoreCase(value.trim())) {
                return mode;
            }
        }
        return pay_after;
    }
}
