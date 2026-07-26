-- Table 4: Master Menu Items (Thực đơn chuẩn Master)
CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    base_price DECIMAL(12, 2) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    is_best_seller BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_menu_code (code),
    INDEX idx_menu_category (category_id),
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
