package com.omniresto.backend.controller;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.model.request.*;
import com.omniresto.backend.model.response.AuthResponse;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.service.CustomerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({ "/api/v1/auth/customer", "/api/v1/customer/auth", "/api/customers", "/api/auth" })
@RequiredArgsConstructor
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;

    // 1. Gửi OTP đến số điện thoại
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        customerAuthService.sendOtp(request);
        return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến số điện thoại thành công!"));
    }

    // 2. Đăng ký tài khoản Thành viên
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody CustomerRegisterRequest request) {
        AuthResponse response = customerAuthService.register(request);
        return ResponseEntity.ok(response);
    }

    // 3. Đăng nhập Thành viên
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody CustomerLoginRequest request) {
        AuthResponse response = customerAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    // 4. Quên mật khẩu
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        customerAuthService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công!"));
    }

    // 5. Xác minh OTP Đăng ký
    @PostMapping("/verify-register-otp")
    public ResponseEntity<Map<String, Object>> verifyRegisterOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean valid = customerAuthService.verifyOtp(request,
                com.omniresto.backend.domain.enums.OtpPurpose.register_verification);
        return ResponseEntity.ok(Map.of("valid", valid, "message", "Xác thực OTP thành công!"));
    }

    // 6. Xác minh OTP Quên mật khẩu
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyResetOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean valid = customerAuthService.verifyOtp(request,
                com.omniresto.backend.domain.enums.OtpPurpose.password_reset);
        return ResponseEntity.ok(Map.of("valid", valid, "message", "Xác thực OTP thành công!"));
    }

    // 7. Đặt lại mật khẩu mới
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        customerAuthService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", "Mật khẩu đã được cập nhật thành công!"));
    }

    // 8. Gửi lại mã OTP
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(defaultValue = "password_reset") com.omniresto.backend.domain.enums.OtpPurpose purpose) {
        String target = email != null && !email.isBlank() ? email : phone;
        customerAuthService.resendOtp(target, purpose);
        return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi lại thành công!"));
    }

    // 9. Lấy danh sách thành viên (Dành cho Admin/Quản lý)
    @GetMapping("/admin/customers")
    public ResponseEntity<List<CustomerResponse>> getAllCustomersForAdmin() {
        List<CustomerResponse> customers = customerAuthService.getAllCustomerResponses();
        return ResponseEntity.ok(customers);
    }

    // 10. Khóa / mở khóa tài khoản (Admin)
    @PatchMapping("/admin/customers/{id}/status")
    public ResponseEntity<CustomerResponse> updateCustomerStatus(
            @PathVariable String id, @RequestParam CustomerStatus status) {
        return ResponseEntity.ok(customerAuthService.updateStatus(id, status));
    }

}