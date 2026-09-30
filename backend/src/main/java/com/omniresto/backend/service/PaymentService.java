package com.omniresto.backend.service;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.response.OrderResponse;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderService orderService;

    // Default VietQR merchant credentials
    private static final String DEFAULT_BANK_ID = "MB"; // MBBank
    private static final String DEFAULT_ACCOUNT_NO = "09888888888";
    private static final String DEFAULT_ACCOUNT_NAME = "NHAN HANG OMNIRESTO";
    private static final String VIETQR_TEMPLATE = "compact2";

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

    public VietQRResponse generateVietQR(String orderId) {
        OrderResponse order = orderService.getOrderById(orderId);

        String transferContent = "OMNIRESTO " + order.getOrderNumber();
        String encodedContent = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
        String encodedAccountName = URLEncoder.encode(DEFAULT_ACCOUNT_NAME, StandardCharsets.UTF_8);

        long amount = order.getTotalAmount() != null ? order.getTotalAmount().longValue() : 0L;

        String qrImageUrl = String.format(
                "https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s&accountName=%s",
                DEFAULT_BANK_ID,
                DEFAULT_ACCOUNT_NO,
                VIETQR_TEMPLATE,
                amount,
                encodedContent,
                encodedAccountName
        );

        return VietQRResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .amount(order.getTotalAmount())
                .qrImageUrl(qrImageUrl)
                .bankId(DEFAULT_BANK_ID)
                .accountNumber(DEFAULT_ACCOUNT_NO)
                .accountName(DEFAULT_ACCOUNT_NAME)
                .transferContent(transferContent)
                .build();
    }

    public OrderResponse handlePaymentWebhook(String orderId, String transactionId, Double amountPaid) {
        System.out.printf("💰 Payment Webhook Received: Order %s, Txn %s, Amount %f%n", orderId, transactionId, amountPaid);
        // Automatically mark order status as COMPLETED / PAID
        return orderService.updateOrderStatus(orderId, OrderStatus.completed);
    }
}
