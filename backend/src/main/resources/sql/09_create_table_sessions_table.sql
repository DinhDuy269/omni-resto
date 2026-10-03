-- Table 9: Table Sessions (Quản lý vòng đời phiên bàn thông minh)
CREATE TABLE IF NOT EXISTS table_sessions (
    id VARCHAR(36) PRIMARY KEY,
    table_id VARCHAR(36) NOT NULL,
    table_no VARCHAR(30) NOT NULL,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAYMENT_REQUESTED, PAID, CLOSED, EXPIRED
    mode VARCHAR(20) NOT NULL DEFAULT 'PAY_AFTER', -- PAY_AFTER (Ăn xong thanh toán), PAY_FIRST (Thanh toán trước mới làm)
    verified_at DATETIME NULL, -- Thời điểm nhân viên xác thực khách đã ngồi vào bàn thực tế
    verified_by_staff_id VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_table_sessions_table (table_id),
    INDEX idx_table_sessions_token (session_token),
    INDEX idx_table_sessions_status (status),
    CONSTRAINT fk_table_sessions_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

