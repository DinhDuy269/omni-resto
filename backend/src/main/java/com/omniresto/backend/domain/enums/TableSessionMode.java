package com.omniresto.backend.domain.enums;

public enum TableSessionMode {
    pay_after, // Chế độ Trả sau: Gọi món trước, ăn xong nhân viên/khách thanh toán tại quầy
    pay_first  // Chế độ Trả trước: Khách thanh toán online VietQR trước thì bếp mới nhận lệnh nấu
}
