package com.omniresto.backend.domain.enums;

public enum TableStatus {
    available,
    occupied,
    reserved,
    cleaning,

    // Bổ sung thêm chữ hoa để khớp với dữ liệu sẵn có trong database MySQL
    AVAILABLE,
    OCCUPIED,
    RESERVED,
    CLEANING
}
