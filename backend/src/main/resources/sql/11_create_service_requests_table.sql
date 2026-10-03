-- Table 11: Service Requests (Yêu cầu gọi nhân viên / phục vụ tại bàn)
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(36) PRIMARY KEY,
    table_session_id VARCHAR(36) NOT NULL,
    table_id VARCHAR(36) NOT NULL,
    table_no VARCHAR(30) NOT NULL,
    request_type VARCHAR(30) NOT NULL, -- ICE, CUTLERY, BROTH, PAYMENT, SUPPORT, OTHER
    note VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, RESOLVED, CANCELLED
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by_staff_id VARCHAR(36),
    INDEX idx_service_requests_status (status),
    INDEX idx_service_requests_table (table_no),
    INDEX idx_service_requests_session (table_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
