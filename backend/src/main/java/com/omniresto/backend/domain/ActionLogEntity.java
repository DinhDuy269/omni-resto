package com.omniresto.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Thực thể lưu trữ Nhật ký thao tác (Action Log) của người quản lý trên trang Admin.
 * Bao gồm đúng 5 thông tin thiết yếu:
 * 1. Tên người thao tác (+ vai trò)
 * 2. Màn thao tác (screen)
 * 3. Chức năng thao tác (feature)
 * 4. Action (action)
 * 5. Thời điểm thao tác (created_at: giờ, phút, giây, ngày, tháng, năm)
 */
@Entity
@Table(name = "action_logs", indexes = {
        @Index(name = "idx_action_logs_created_at", columnList = "created_at"),
        @Index(name = "idx_action_logs_screen", columnList = "screen"),
        @Index(name = "idx_action_logs_user_name", columnList = "user_name")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionLogEntity {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_name", length = 100, nullable = false)
    private String userName;

    @Column(name = "user_role", length = 30)
    private String userRole;

    @Column(nullable = false, length = 100)
    private String screen;

    @Column(nullable = false, length = 100)
    private String feature;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String action;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = "act-" + UUID.randomUUID().toString().substring(0, 8);
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
