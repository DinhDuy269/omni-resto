package com.omniresto.backend.model;

import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuthDto {

    // 1. Request Đăng ký tài khoản
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        @NotBlank(message = "Họ và tên không được để trống")
        private String fullName;

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^(0|\\+84)[0-9]{9}$", message = "Số điện thoại không hợp lệ")
        private String phone;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải từ 6 ký tự trở lên")
        private String password;
    }

    // 2. Request Yêu cầu gửi lại mã OTP (Đăng ký hoặc Quên mật khẩu)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendOtpRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;
    }

    // 3. Request Xác minh OTP đăng ký
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyRegisterOtpRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        @Size(min = 6, max = 6, message = "Mã OTP phải đúng 6 chữ số")
        private String otpCode;
    }

    // 4. Request Đăng nhập
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Email hoặc số điện thoại không được để trống")
        private String usernameOrEmail;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;
    }

    // 5. Request Xác minh OTP quên mật khẩu
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyResetOtpRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        @Size(min = 6, max = 6, message = "Mã OTP phải đúng 6 chữ số")
        private String otpCode;
    }

    // 6. Request Đặt lại mật khẩu mới (sau khi xác minh OTP thành công)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        private String otpCode;

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, message = "Mật khẩu mới phải từ 6 ký tự trở lên")
        private String newPassword;
    }

    // 7. Response Trả về thông tin Auth thành công
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {
        private String token;
        private UUID userId;
        private String fullName;
        private String email;
        private RoleType role;
        private UserStatus status;
    }

    // 8. DTO Quản lý thông tin User hiển thị ở Admin
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserAdminDto {
        private UUID id;
        private String fullName;
        private String email;
        private String phone;
        private RoleType role;
        private UserStatus status;
        private LocalDateTime createdAt;
    }

    // 9. Request Cập nhật trạng thái User từ Admin (Khóa, Duyệt, Kích hoạt)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateUserStatusRequest {
        private UserStatus status;
    }
}