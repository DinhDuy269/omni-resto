package com.omniresto.backend.model.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phản hồi thống nhất sau khi đăng nhập hoặc đăng ký thành công.
 * Dùng cho cả Customer lẫn Staff/Admin — frontend phân tuyến dựa vào field `role`.
 *
 * role có thể là: "customer", "admin", "store_manager", "cashier", "waiter", "chef"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;

    @Builder.Default
    private String type = "Bearer";

    /** ID thực trong DB (cus-xxx hoặc usr-xxx) */
    private String id;

    private String fullName;
    private String email;
    private String phone;
    private String avatar;

    /**
     * Role thực từ DB.
     * "customer" → vào trang khách hàng.
     * "admin" / "store_manager" / "cashier" / "waiter" / "chef" → vào admin portal.
     */
    private String role;

    // ── Trường bổ sung chỉ dành cho Customer ──
    private String memberTier;
    private Integer points;
}
