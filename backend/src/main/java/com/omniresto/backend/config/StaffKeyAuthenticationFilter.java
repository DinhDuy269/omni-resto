package com.omniresto.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Filter xác thực khóa nhân viên X-Staff-Key.
 * Sử dụng MessageDigest.isEqual (constant-time comparison) để phòng chống tấn công dò khóa bằng thời gian (timing attacks).
 * 
 * LƯU Ý KIẾN TRÚC:
 * Đây là cơ chế bảo mật chuyển tiếp cho môi trường phát triển & demo nội bộ.
 * Trên môi trường Production thực tế, khuyến nghị sử dụng JWT Token hoặc Session đăng nhập riêng
 * cho từng tài khoản nhân sự (RBAC) thông qua /api/auth/login.
 */
@Component
public class StaffKeyAuthenticationFilter extends OncePerRequestFilter {

    @Value("${omniresto.security.staff-key:STAFF_SECRET_KEY}")
    private String configuredStaffKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String staffKey = request.getHeader("X-Staff-Key");

        // Kiểm tra xác thực bằng X-Staff-Key hợp lệ (cho POS, KDS, Upload và Admin Portal)
        if (staffKey != null && !staffKey.isBlank() && isKeyValid(staffKey, configuredStaffKey)) {
            String staffRoleHeader = request.getHeader("X-Staff-Role");
            String staffIdHeader = request.getHeader("X-Staff-Id");
            List<SimpleGrantedAuthority> authorities;

            boolean isWaiterOrStaff = (staffRoleHeader != null && (
                    "WAITER".equalsIgnoreCase(staffRoleHeader) ||
                    "CASHIER".equalsIgnoreCase(staffRoleHeader) ||
                    "CHEF".equalsIgnoreCase(staffRoleHeader) ||
                    "STAFF".equalsIgnoreCase(staffRoleHeader)))
                    || (staffIdHeader != null && (
                    staffIdHeader.toUpperCase().contains("WAITER") ||
                    staffIdHeader.toUpperCase().contains("STAFF") ||
                    staffIdHeader.toUpperCase().contains("CHEF")));

            boolean isManager = (staffRoleHeader != null && (
                    "STORE_MANAGER".equalsIgnoreCase(staffRoleHeader) ||
                    "MANAGER".equalsIgnoreCase(staffRoleHeader)))
                    || (staffIdHeader != null && (
                    staffIdHeader.toUpperCase().contains("MANAGER") ||
                    staffIdHeader.toUpperCase().contains("MGR")));

            if (isWaiterOrStaff && !isManager) {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_STAFF"));
            } else if (isManager) {
                authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_STAFF"),
                        new SimpleGrantedAuthority("ROLE_STORE_MANAGER")
                );
            } else {
                authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_STAFF"),
                        new SimpleGrantedAuthority("ROLE_STORE_MANAGER"),
                        new SimpleGrantedAuthority("ROLE_ADMIN")
                );
            }

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    "STAFF_AUTH_USER",
                    null,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private boolean isKeyValid(String clientKey, String serverKey) {
        if (clientKey == null || serverKey == null) return false;
        byte[] b1 = clientKey.trim().getBytes(StandardCharsets.UTF_8);
        byte[] b2 = serverKey.trim().getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(b1, b2);
    }
}
