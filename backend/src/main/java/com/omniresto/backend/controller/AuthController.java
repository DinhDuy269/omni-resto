package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.model.request.CustomerRegisterRequest;
import com.omniresto.backend.model.request.LoginRequest;
import com.omniresto.backend.model.response.AuthResponse;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xác thực thống nhất cho toàn bộ hệ thống OmniResto.
 * Base URL: /api/auth
 *
 * Chỉ duy trì các endpoint cần thiết:
 *   POST /api/auth/login    - Đăng nhập (tự động phân giải tài khoản và Role)
 *   POST /api/auth/register - Đăng ký tài khoản trực tiếp
 *   GET  /api/auth/admin/customers - Quản lý hội viên cho Admin
 *   PATCH /api/auth/admin/customers/{id}/status - Cập nhật trạng thái hội viên
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ── 1. Đăng nhập (dùng chung cho mọi đối tượng: Khách, Nhân viên, Quản lý, Admin) ──
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // ── 2. Đăng ký tài khoản Khách hàng ──
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody CustomerRegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    // ── 3. Admin: Lấy danh sách khách hàng ──
    @GetMapping("/admin/customers")
    public ResponseEntity<List<CustomerResponse>> getAllCustomers() {
        return ResponseEntity.ok(authService.getAllCustomerResponses());
    }

    // ── 4. Admin: Khóa / mở khóa tài khoản khách hàng ──
    @PatchMapping("/admin/customers/{id}/status")
    public ResponseEntity<CustomerResponse> updateCustomerStatus(
            @PathVariable String id, @RequestParam CustomerStatus status) {
        return ResponseEntity.ok(authService.updateCustomerStatus(id, status));
    }
}
