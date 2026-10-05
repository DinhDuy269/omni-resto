package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OtpPurpose;
import com.omniresto.backend.model.AuthDto;
import com.omniresto.backend.model.base.response.ApiResponse;
import com.omniresto.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1. API Đăng ký tài khoản
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody AuthDto.RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký tài khoản thành công! Mã OTP đã được gửi đến email của bạn.", null));
    }

    // 2. API Xác minh OTP đăng ký tài khoản
    @PostMapping("/verify-register-otp")
    public ResponseEntity<ApiResponse<String>> verifyRegisterOtp(@Valid @RequestBody AuthDto.VerifyRegisterOtpRequest request) {
        authService.verifyRegisterOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Tài khoản của bạn đã được kích hoạt thành công. Hãy đăng nhập!", null));
    }

    // 3. API Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDto.AuthResponse>> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        AuthDto.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công!", response));
    }

    // 4. API Yêu cầu gửi mã OTP quên mật khẩu
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody AuthDto.SendOtpRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP khôi phục mật khẩu đã được gửi về email của bạn.", null));
    }

    // 5. API Xác minh OTP quên mật khẩu
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<ApiResponse<String>> verifyResetOtp(@Valid @RequestBody AuthDto.VerifyResetOtpRequest request) {
        authService.verifyResetOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP hợp lệ! Bạn có thể đặt lại mật khẩu mới.", null));
    }

    // 6. API Đặt lại mật khẩu mới
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody AuthDto.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.", null));
    }

    // 7. API Gửi lại mã OTP
    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<String>> resendOtp(@RequestParam String email, @RequestParam OtpPurpose purpose) {
        authService.resendOtp(email, purpose);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP mới đã được gửi thành công!", null));
    }

    // --- ENDPOINTS QUẢN LÝ DÀNH CHO ADMIN ---

    // 8. Admin lấy danh sách thành viên/đăng ký
    @GetMapping("/admin/users")
    public ResponseEntity<ApiResponse<List<AuthDto.UserAdminDto>>> getAllUsers() {
        List<AuthDto.UserAdminDto> users = authService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên thành công!", users));
    }

    // 9. Admin cập nhật trạng thái tài khoản
    @PutMapping("/admin/users/{id}/status")
    public ResponseEntity<ApiResponse<String>> updateUserStatus(
            @PathVariable UUID id,
            @RequestBody AuthDto.UpdateUserStatusRequest request) {
        authService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái người dùng thành công!", null));
    }
}