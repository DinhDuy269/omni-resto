package com.omniresto.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("🔧 Running automatic schema self-healing patch...");
        safeExecute("ALTER TABLE `orders` ADD COLUMN `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6)");
        safeExecute("ALTER TABLE `order_item_options` ADD COLUMN `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6)");
        safeExecute("ALTER TABLE `tables` ADD COLUMN `current_order_id` VARCHAR(36) NULL");
        safeExecute("ALTER TABLE `reservations` ADD COLUMN `table_id` VARCHAR(36) NULL");
        safeExecute("ALTER TABLE `reservations` ADD COLUMN `special_notes` TEXT NULL");
        safeExecute("UPDATE `vouchers` SET `status` = LOWER(`status`), `discount_type` = LOWER(`discount_type`), `voucher_type` = LOWER(`voucher_type`)");
        safeExecute("UPDATE `voucher_redemptions` SET `status` = LOWER(`status`)");
        safeExecute("UPDATE `reservations` SET `status` = LOWER(`status`)");
        safeExecute("UPDATE `tables` SET `status` = LOWER(`status`)");
        safeExecute("UPDATE `orders` SET `status` = LOWER(`status`), `payment_status` = LOWER(`payment_status`)");
        safeExecute("UPDATE `order_items` SET `status` = LOWER(`status`)");

        // Tự động tạo bảng action_logs để ghi vết nhật ký thao tác
        safeExecute("""
            CREATE TABLE IF NOT EXISTS `action_logs` (
                `id` VARCHAR(36) PRIMARY KEY,
                `user_id` VARCHAR(36) NULL,
                `user_name` VARCHAR(100) NOT NULL,
                `user_role` VARCHAR(30) NULL,
                `screen` VARCHAR(100) NOT NULL,
                `feature` VARCHAR(100) NOT NULL,
                `action_type` VARCHAR(50) NOT NULL,
                `description` TEXT NULL,
                `status` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                `ip_address` VARCHAR(50) NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_action_logs_created_at (`created_at`),
                INDEX idx_action_logs_screen (`screen`),
                INDEX idx_action_logs_user_name (`user_name`),
                INDEX idx_action_logs_action_type (`action_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """);

        log.info("✅ Schema self-healing patch completed.");
    }

    private void safeExecute(String sql) {
        try {
            jdbcTemplate.execute(sql);
            log.info("Executed DDL: {}", sql);
        } catch (Exception e) {
            // Cột đã tồn tại hoặc bảng chưa tạo - an toàn bỏ qua
            log.debug("DDL skipped or already present: {} ({})", sql, e.getMessage());
        }
    }
}
