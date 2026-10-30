-- Table 10: Payment Transactions (Bảo mật thanh toán, Idempotency & Đối soát)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE, -- Mã giao dịch ngân hàng / gateway
    amount_expected DECIMAL(15, 2) NOT NULL,
    amount_received DECIMAL(15, 2) NOT NULL,
    payment_gateway VARCHAR(30) NOT NULL DEFAULT 'VNPAY',
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, UNDERPAID, OVERPAID, FAILED
    raw_payload TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payment_tx_order (order_id),
    INDEX idx_payment_tx_ref (transaction_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
