package com.omniresto.backend.util;

import com.omniresto.backend.exception.BadRequestException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
        // Utility class
    }

    /**
     * Trích xuất customerId từ SecurityContext hiện tại (Zero-Trust IDOR Defense).
     * Tuyệt đối không nhận customerId từ request body hay query param.
     */
    public static String getCurrentCustomerId() {
        return getCurrentCustomerIdOptional()
                .orElseThrow(() -> new BadRequestException("Yêu cầu đăng nhập tài khoản thành viên để sử dụng tính năng này!"));
    }

    /**
     * Trích xuất customerId an toàn, trả về Optional nếu là khách vãng lai (Guest)
     */
    public static Optional<String> getCurrentCustomerIdOptional() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated() ||
                authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        String principal = authentication.getName();
        if (principal == null || principal.isBlank() || "anonymousUser".equalsIgnoreCase(principal)) {
            return Optional.empty();
        }

        return Optional.of(principal);
    }

    /**
     * Kiểm tra xem người dùng hiện tại có bất kỳ role nào trong danh sách hay không.
     */
    public static boolean hasAnyRole(String... roles) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return false;
        }

        return authentication.getAuthorities().stream().anyMatch(a -> {
            String authName = a.getAuthority();
            for (String role : roles) {
                if (authName.equalsIgnoreCase("ROLE_" + role) || authName.equalsIgnoreCase(role)) {
                    return true;
                }
            }
            return false;
        });
    }
}
