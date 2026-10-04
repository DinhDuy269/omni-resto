package com.omniresto.backend.exception;

public class BadRequestException extends RuntimeException { // [SỬA] kế thừa RuntimeException để dùng được với throw

    public BadRequestException(String message) { // [THÊM] constructor nhận thông báo lỗi
        super(message);
    }
}