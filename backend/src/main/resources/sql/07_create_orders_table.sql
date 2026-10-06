-- Table 7: Orders (Đơn hàng chuỗi)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    table_id VARCHAR(36),
    table_no VARCHAR(30),
    order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN', -- DINE_IN, TAKEAWAY, DELIVERY
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PREPARING, READY, COMPLETED, CANCELLED
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    customer_name VARCHAR(100),
    payment_method VARCHAR(20) DEFAULT 'CASH', -- CASH, CARD, QR_CODE
    created_by_user_id VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_status (status),
    INDEX idx_orders_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
