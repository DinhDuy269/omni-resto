package com.omniresto.backend.domain.enums;

public enum UserStatus {
    ACTIVE,               // Tài khoản đang hoạt động
    INACTIVE,             // Ngưng hoạt động
    PENDING_VERIFICATION, // Chờ xác thực OTP
    BLOCKED               // Bị khóa tài khoản
}