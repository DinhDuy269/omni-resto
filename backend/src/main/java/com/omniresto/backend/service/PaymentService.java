package com.omniresto.backend.service;

import com.omniresto.backend.domain.PaymentTransactionEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.PaymentTransactionStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.PaymentTransactionRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final OrderService orderService;
    private final PaymentTransactionRepository paymentTransactionRepository;

    // Configurable VietQR merchant credentials
    @Value("${vietqr.bank-id:MB}")
    private String bankId = "MB";

    @Value("${vietqr.account-number:0368295264}")
    private String accountNumber = "0368295264";

    @Value("${vietqr.account-name:NHAN HANG OMNIRESTO}")
    private String accountName = "NHAN HANG OMNIRESTO";

    @Value("${vietqr.template:compact2}")
    private String vietqrTemplate = "compact2";

    @Data
    @Builder
    public static class VietQRResponse {
        private String orderId;
        private String orderNumber;
        private BigDecimal amount;
        private String qrImageUrl;
        private String bankId;
        private String accountNumber;
        private String accountName;
        private String transferContent;
    }

    @Data
    @Builder
    public static class PaymentStatusResponse {
        private String orderId;
        private String orderNumber;
        private boolean isPaid;
        private OrderStatus orderStatus;
        private BigDecimal totalAmount;
        private BigDecimal totalPaid;
        private String transactionReference;
        private String statusMessage;
    }

    public VietQRResponse generateVietQR(String orderId) {
        OrderResponse order = orderService.getOrderById(orderId);

        String transferContent = "OMNIRESTO " + order.getOrderNumber();
        String encodedContent = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);

        long amount = order.getTotalAmount() != null ? order.getTotalAmount().longValue() : 0L;

        String qrImageUrl = String.format(
                "https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s&accountName=%s",
                bankId,
                accountNumber,
                vietqrTemplate,
                amount,
                encodedContent,
                encodedAccountName
        );

        return VietQRResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .amount(order.getTotalAmount())
                .qrImageUrl(qrImageUrl)
                .bankId(bankId)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .transferContent(transferContent)
                .build();
    }

    @Transactional
    public OrderResponse handlePaymentWebhook(String orderId, String transactionReference, Double amountPaid) {
        return handlePaymentWebhook(orderId, transactionReference, amountPaid, null);
    }

    @Transactional
    public OrderResponse handlePaymentWebhook(String orderId, String transactionReference, Double amountPaid, String rawPayload) {
        if (transactionReference == null || transactionReference.isBlank()) {
            transactionReference = "TXN-" + System.currentTimeMillis();
        }

        log.info("💰 Payment Webhook Received: Order {}, Txn {}, Amount {}", orderId, transactionReference, amountPaid);

        // ── 1. Idempotency Check (Chống thanh toán trùng lặp / webhook gửi lại) ──
        Optional<PaymentTransactionEntity> existingTx = paymentTransactionRepository.findByTransactionReference(transactionReference);
        if (existingTx.isPresent()) {
            log.warn("⚠️ Webhook trùng lặp! Mã giao dịch {} đã được xử lý trước đó.", transactionReference);
            return orderService.getOrderById(orderId);
        }

        OrderResponse order = orderService.getOrderById(orderId);
        BigDecimal expectedAmount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal actualAmount = amountPaid != null ? BigDecimal.valueOf(amountPaid) : BigDecimal.ZERO;

        PaymentTransactionStatus txStatus;
        if (actualAmount.compareTo(expectedAmount) < 0) {
            txStatus = PaymentTransactionStatus.underpaid;
            log.warn("⚠️ Thanh toán thiếu tiền: Cần {}đ, nhận {}đ cho đơn {}", expectedAmount, actualAmount, orderId);
        } else if (actualAmount.compareTo(expectedAmount) > 0) {
            txStatus = PaymentTransactionStatus.overpaid;
            log.info("ℹ️ Khách thanh toán dư tiền cho đơn {}", orderId);
        } else {
            txStatus = PaymentTransactionStatus.success;
        }

        // Lưu bản ghi giao dịch bảo mật
        PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                .orderId(orderId)
                .transactionReference(transactionReference)
                .amountExpected(expectedAmount)
                .amountReceived(actualAmount)
                .paymentGateway("VIETQR")
                .status(txStatus)
                .rawPayload(rawPayload)
                .build();
        tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
        paymentTransactionRepository.save(tx);

        OrderResponse updatedOrder;
        if (txStatus == PaymentTransactionStatus.underpaid) {
            // Không chuyển đơn sang bếp, gửi cảnh báo POS
            notifyPaymentEvent(orderId, "PAYMENT_UNDERPAID", Map.of(
                    "orderId", orderId,
                    "expected", expectedAmount,
                    "received", actualAmount,
                    "transactionReference", transactionReference
            ));
            return order;
        } else {
            // Thanh toán đủ / dư: Chuyển đơn sang PREPARING (Bếp bắt đầu nấu)
            updatedOrder = orderService.updateOrderStatus(orderId, OrderStatus.preparing);
            notifyPaymentEvent(orderId, "PAYMENT_SUCCESS", Map.of(
                    "orderId", orderId,
                    "amount", actualAmount,
                    "transactionReference", transactionReference,
                    "status", "PAID"
            ));
        }

        return updatedOrder;
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(String orderId) {
        OrderResponse order = orderService.getOrderById(orderId);
        List<PaymentTransactionEntity> txList = paymentTransactionRepository.findByOrderId(orderId);

        boolean isPaid = order.getStatus() == OrderStatus.preparing
                || order.getStatus() == OrderStatus.ready
                || order.getStatus() == OrderStatus.completed;

        BigDecimal totalPaid = txList.stream()
                .filter(t -> t.getStatus() == PaymentTransactionStatus.success || t.getStatus() == PaymentTransactionStatus.overpaid)
                .map(PaymentTransactionEntity::getAmountReceived)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String txRef = txList.isEmpty() ? null : txList.get(txList.size() - 1).getTransactionReference();

        return PaymentStatusResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .isPaid(isPaid)
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .totalPaid(totalPaid)
                .transactionReference(txRef)
                .statusMessage(isPaid ? "Đã thanh toán thành công" : "Chờ thanh toán")
                .build();
    }

    private void notifyPaymentEvent(String orderId, String eventType, Object payload) {
        log.debug("Payment event: {} for order: {}", eventType, orderId);
    }
}
