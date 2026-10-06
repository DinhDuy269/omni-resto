package com.omniresto.backend.domain.enums;

public enum TableSessionMode {
    PAY_AFTER, // Chế độ Trả sau: Gọi món trước, ăn xong nhân viên/khách thanh toán tại quầy
    PAY_FIRST  // Chế độ Trả trước: Khách thanh toán online VietQR trước thì bếp mới nhận lệnh nấu
}
