package com.omniresto.backend.domain.enums;

public enum TableSessionStatus {
    active,             // Phiên đang hoạt động, phục vụ và gọi món bình thường
    payment_requested,  // Khách/nhân viên yêu cầu thanh toán -> hóa đơn đóng băng, mã QR cố định số tiền
    payment_pending,    // Chờ xử lý thanh toán (tương thích ngược)
    paid,               // Đã nhận đủ tiền (nhân viên xác nhận hoặc cổng thanh toán)
    closed,             // Đã dọn bàn xong, kết thúc phiên, vô hiệu token
    expired             // Hết hạn do quá thời gian không hoạt động
}
