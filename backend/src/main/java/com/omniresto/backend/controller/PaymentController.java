package com.omniresto.backend.controller;

import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.service.PaymentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/vietqr/{orderId}")
    public PaymentService.VietQRResponse getVietQR(@PathVariable String orderId) {
        return paymentService.generateVietQR(orderId);
    }

    @GetMapping("/status/{orderId}")
    public PaymentService.PaymentStatusResponse getPaymentStatus(@PathVariable String orderId) {
        return paymentService.getPaymentStatus(orderId);
    }

    @Data
    public static class WebhookRequest {
        private String orderId;
        private String transactionId;
        private Double amount;
        private String rawPayload;
    }

    @PostMapping("/webhook")
    public OrderResponse paymentWebhook(@RequestBody WebhookRequest request) {
        return paymentService.handlePaymentWebhook(
                request.getOrderId(),
                request.getTransactionId() != null ? request.getTransactionId() : "TXN-" + System.currentTimeMillis(),
                request.getAmount(),
                request.getRawPayload()
        );
    }
}
