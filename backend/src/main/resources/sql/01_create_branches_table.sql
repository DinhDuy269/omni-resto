-- Table 1: Branches (Chi nhánh nhà hàng)
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    manager_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tables_count INT NOT NULL DEFAULT 0,
    daily_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    rating DOUBLE DEFAULT 5.0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_branches_code (code),
    INDEX idx_branches_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
