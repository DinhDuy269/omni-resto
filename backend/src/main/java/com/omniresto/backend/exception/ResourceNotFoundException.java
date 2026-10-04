package com.omniresto.backend.exception;

public class ResourceNotFoundException extends RuntimeException { // [SỬA] kế thừa RuntimeException để dùng được với throw

    public ResourceNotFoundException(String message) { // [THÊM] constructor nhận thông báo lỗi
        super(message);
    }
}