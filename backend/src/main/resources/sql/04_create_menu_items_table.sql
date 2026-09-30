-- Table 5: Menu Items (Đã bổ sung cột ingredients)
CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    description TEXT,
    ingredients TEXT,                                          -- Mô tả nguyên liệu (dữ liệu phi cấu trúc)
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',           -- AVAILABLE, UNAVAILABLE
    is_best_seller BOOLEAN DEFAULT FALSE,
    meal_periods VARCHAR(100) DEFAULT 'MORNING,NOON,EVENING',  -- Lọc theo buổi: MORNING, NOON, EVENING
    image_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_menu_category (category_id),
    INDEX idx_menu_status (status),
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT chk_menu_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;