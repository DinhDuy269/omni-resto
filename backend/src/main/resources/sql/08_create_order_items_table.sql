-- Table 8: Order Items (Chi tiết món trong đơn hàng)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    menu_item_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(120) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order (order_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
