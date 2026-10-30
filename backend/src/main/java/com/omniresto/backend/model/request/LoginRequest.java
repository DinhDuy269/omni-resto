package com.omniresto.backend.model.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO đăng nhập dùng chung cho cả Customer lẫn Staff/Admin.
 * Backend tự xác định role dựa trên thông tin tìm được trong DB.
 */
@Data
public class LoginRequest {

    /**
     * Email hoặc số điện thoại (dùng được cho cả Customer lẫn Staff).
     * Staff bắt buộc dùng email; Customer có thể dùng cả hai.
     */
    @NotBlank(message = "Thông tin đăng nhập không được để trống!")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống!")
    private String password;
}

