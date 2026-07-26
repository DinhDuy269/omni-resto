-- Table 5: Branch Menu Items (Cấu hình món & Giá theo từng chi nhánh)
CREATE TABLE IF NOT EXISTS branch_menu_items (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    menu_item_id VARCHAR(36) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    custom_price DECIMAL(12, 2), -- NULL means use master base_price
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_branch_menu (branch_id, menu_item_id),
    CONSTRAINT fk_bmi_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_bmi_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
