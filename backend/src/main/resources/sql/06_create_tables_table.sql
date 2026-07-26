-- Table 6: Dining Room Tables (Sơ đồ bàn tại chi nhánh)
CREATE TABLE IF NOT EXISTS tables (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    table_no VARCHAR(30) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, RESERVED, CLEANING
    current_order_id VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tables_branch (branch_id),
    INDEX idx_tables_status (status),
    CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
