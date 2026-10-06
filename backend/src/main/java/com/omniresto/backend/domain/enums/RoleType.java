package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RoleType {
    admin, // Admin / Chủ Chuỗi (Quyền cao nhất)
    store_manager, // Quản Lý Cửa Hàng
    cashier, // Thu Ngân Quầy
    waiter, // Phục Vụ / Order Bàn
    chef; // Bếp / Bar Chế Biến

    @JsonCreator
    public static RoleType fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String val = value.trim().toLowerCase();
        for (RoleType role : RoleType.values()) {
            if (role.name().equalsIgnoreCase(val)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Vai trò không hợp lệ: " + value);
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
