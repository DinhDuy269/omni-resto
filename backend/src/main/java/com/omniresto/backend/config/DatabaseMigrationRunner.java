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
