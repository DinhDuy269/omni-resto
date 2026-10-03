package com.omniresto.backend.domain.enums;

public enum TableSessionStatus {
    ACTIVE,             // Phiên đang hoạt động, phục vụ và gọi món bình thường
    PAYMENT_REQUESTED,  // Khách/nhân viên yêu cầu thanh toán -> hóa đơn đóng băng, mã QR cố định số tiền
    PAYMENT_PENDING,    // Chờ xử lý thanh toán (tương thích ngược)
    PAID,               // Đã nhận đủ tiền (nhân viên xác nhận hoặc webhook VietQR)
    CLOSED,             // Đã dọn bàn xong, kết thúc phiên, vô hiệu token
    EXPIRED             // Hết hạn do quá thời gian không hoạt động
}

