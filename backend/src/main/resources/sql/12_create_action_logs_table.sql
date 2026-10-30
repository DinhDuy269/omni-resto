-- Table 12: Action Logs (Nhật ký thao tác của người quản lý trên trang admin)
DROP TABLE IF EXISTS action_logs;
CREATE TABLE action_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(30) NULL,
    screen VARCHAR(100) NOT NULL,
    feature VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action_logs_created_at (created_at),
    INDEX idx_action_logs_screen (screen),
    INDEX idx_action_logs_user_name (user_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
