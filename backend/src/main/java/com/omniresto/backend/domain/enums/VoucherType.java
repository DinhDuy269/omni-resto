package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum VoucherType {
    general,    // Khuyến mãi chung toàn hệ thống
    welcome,    // Dành riêng cho thành viên mới (chưa có đơn thành công nào)
    birthday;   // Dành riêng cho tháng sinh nhật của khách hàng

    @JsonCreator
    public static VoucherType fromString(String value) {
        if (value == null) return general;
        for (VoucherType t : values()) {
            if (t.name().equalsIgnoreCase(value.trim())) {
                return t;
            }
        }
        return general;
    }
}
