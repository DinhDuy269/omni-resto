package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum RedemptionStatus {
    applied,    // Đã áp dụng vào đơn hàng
    reverted;   // Đã hoàn lại lượt dùng khi đơn hàng bị hủy

    @JsonCreator
    public static RedemptionStatus fromString(String value) {
        if (value == null) return applied;
        for (RedemptionStatus s : values()) {
            if (s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        return applied;
    }
}
