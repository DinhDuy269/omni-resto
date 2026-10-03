package com.omniresto.backend.domain.enums;

public enum PaymentTransactionStatus {
    SUCCESS,   // Khớp số tiền hoặc thừa tiền, giao dịch hợp lệ
    UNDERPAID, // Khách chuyển thiếu tiền so với tổng đơn
    OVERPAID,  // Khách chuyển thừa tiền
    FAILED     // Giao dịch lỗi hoặc bị hủy
}
