package com.omniresto.backend.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.config.VnPayConfig;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.model.payment.VnPayCallbackResponse;
import com.omniresto.backend.model.payment.VnPayPaymentResponse;
import com.omniresto.backend.model.payment.VnPayProcessPaymentRequest;
import com.omniresto.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

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

    // ── VNPAY Sandbox Endpoints ──────────────────────────────────────────

    @GetMapping("/vnpay/create/{orderId}")
    public VnPayPaymentResponse createVnPayPaymentGet(
            @PathVariable String orderId,
            HttpServletRequest request
    ) {
        String clientIp = VnPayConfig.getIpAddress(request);
        return paymentService.generateVnPayPayment(orderId, clientIp);
    }

    @Data
    public static class VnPayCreateRequest {
        @JsonProperty("order_id")
        private String orderId;
    }

    @PostMapping("/vnpay/create-payment")
    public VnPayPaymentResponse createVnPayPaymentPost(
            @RequestBody VnPayCreateRequest req,
            HttpServletRequest request
    ) {
        String clientIp = VnPayConfig.getIpAddress(request);
        return paymentService.generateVnPayPayment(req.getOrderId(), clientIp);
    }

    @GetMapping("/vnpay/callback")
    public VnPayCallbackResponse vnPayCallback(@RequestParam Map<String, String> allParams) {
        return paymentService.processVnPayCallback(allParams);
    }

    @GetMapping("/vnpay/ipn")
    public Map<String, String> vnPayIpn(@RequestParam Map<String, String> allParams) {
        VnPayCallbackResponse callbackRes = paymentService.processVnPayCallback(allParams);
        Map<String, String> result = new HashMap<>();
        if (callbackRes.isSuccess()) {
            result.put("RspCode", "00");
            result.put("Message", "Confirm Success");
        } else {
            result.put("RspCode", callbackRes.getResponseCode() != null ? callbackRes.getResponseCode() : "99");
            result.put("Message", callbackRes.getMessage() != null ? callbackRes.getMessage() : "Payment Failed");
        }
        return result;
    }

    @PostMapping("/vnpay/pay")
    public VnPayCallbackResponse processVnPayDirectPayment(@RequestBody VnPayProcessPaymentRequest req) {
        return paymentService.processDirectVnPayPayment(req);
    }

    @GetMapping("/vnpay/sandbox-config")
    public Map<String, Object> getVnPaySandboxConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("bank_name", "NCB");
        config.put("card_number", "9704198526191432198");
        config.put("card_holder", "NGUYEN VAN A");
        config.put("payment_date", "07/15");
        config.put("otp", "123456");
        return config;
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
