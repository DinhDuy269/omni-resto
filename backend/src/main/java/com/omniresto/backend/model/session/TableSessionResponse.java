package com.omniresto.backend.model.session;

import com.omniresto.backend.domain.enums.PaymentStatus;
import com.omniresto.backend.domain.enums.TableSessionMode;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TableSessionResponse {
    private String id;
    private String tableId;
    private String tableNo;
    private String sessionToken;
    private String deviceToken;
    private Boolean isDeviceMaster;
    private TableSessionStatus status;
    private TableSessionMode mode;
    private LocalDateTime verifiedAt;
    private boolean isVerified;
    private String verifiedByStaffId;
    private LocalDateTime createdAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime expiresAt;
    private String message;

    // Thông tin hóa đơn mở hiện tại của phiên bàn (Zero-trust cho Frontend)
    private String activeOrderId;
    private String activeOrderNumber;
    private BigDecimal totalAmount;
    private PaymentStatus paymentStatus;

    // Chi tiết VietQR khi bàn ở trạng thái PAYMENT_REQUESTED
    private VietQRInfo vietQr;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VietQRInfo {
        private String qrImageUrl;
        private BigDecimal amount;
        private String bankId;
        private String accountNumber;
        private String accountName;
        private String transferContent;
    }
}

