-- Table: Category Options (Tùy chọn kích cỡ & Topping theo kiểu món)
CREATE TABLE IF NOT EXISTS category_options (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,                             -- Ví dụ: "Tô Lớn", "Quẩy Giòn", "Trân châu đen"
    option_type VARCHAR(20) NOT NULL DEFAULT 'TOPPING',     -- 'SIZE' (chọn 1) hoặc 'TOPPING' (chọn nhiều)
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,            -- Giá cộng thêm (0đ cho size chuẩn)
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',       -- AVAILABLE / UNAVAILABLE
    display_order INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_options_cat (category_id),
    INDEX idx_category_options_status (status),
    CONSTRAINT fk_category_options_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT chk_category_options_type CHECK (option_type IN ('SIZE', 'TOPPING')),
    CONSTRAINT chk_category_options_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
