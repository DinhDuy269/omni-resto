package com.omniresto.backend.controller;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.config.VnPayConfig;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.model.payment.PaymentWebhookResponse;
import com.omniresto.backend.model.payment.VnPayCallbackResponse;
import com.omniresto.backend.model.payment.VnPayPaymentResponse;
import com.omniresto.backend.model.payment.VnPayProcessPaymentRequest;
import com.omniresto.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Value("${vnpay.sandbox.direct-pay.enabled:true}")
    private boolean vnpayDirectPayEnabled;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

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
        @JsonAlias({"orderId", "order_id"})
        private String orderId;
    }

    @PostMapping("/vnpay/create-payment")
    public VnPayPaymentResponse createVnPayPaymentPost(
            @RequestBody VnPayCreateRequest req,
            HttpServletRequest request
    ) {
        if (req == null || req.getOrderId() == null || req.getOrderId().isBlank()) {
            throw new BadRequestException("Mã đơn hàng (order_id) không được để trống!");
        }
        String clientIp = VnPayConfig.getIpAddress(request);
        return paymentService.generateVnPayPayment(req.getOrderId(), clientIp);
    }

    /**
     * VNPAY Browser Return URL (READ-ONLY)
     * Trình duyệt của khách redirect về sau khi thanh toán trên cổng VNPAY.
     */
    @GetMapping("/vnpay/callback")
    public VnPayCallbackResponse vnPayCallback(@RequestParam Map<String, String> allParams) {
        return paymentService.processVnPayCallback(allParams);
    }

    /**
     * VNPAY Server-to-Server Instant Payment Notification (IPN)
     * Máy chủ VNPAY gọi trực tiếp ngầm sang hệ thống để xác nhận giao dịch độc lập.
     */
    @GetMapping("/vnpay/ipn")
    public Map<String, String> vnPayIpn(@RequestParam Map<String, String> allParams) {
        return paymentService.processVnPayIpn(allParams);
    }

    /**
     * Giả lập thanh toán thẻ nội địa Sandbox
     * Chỉ kích hoạt trong môi trường Sandbox/Dev. Bị từ chối ở Production.
     */
    @PostMapping("/vnpay/pay")
    public VnPayCallbackResponse processVnPayDirectPayment(@RequestBody VnPayProcessPaymentRequest req) {
        if (!vnpayDirectPayEnabled || "prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile)) {
            log.warn("🚨 [SECURITY] Chặn truy cập endpoint giả lập thanh toán thẻ nội địa trên Production!");
            throw new AccessDeniedException("Chức năng giả lập thanh toán thẻ nội địa (Sandbox Direct Pay) bị vô hiệu hóa trên môi trường Production!");
        }
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
        @JsonProperty("order_id")
        @JsonAlias({"orderId", "order_id"})
        private String orderId;

        @JsonProperty("order_number")
        @JsonAlias({"orderNumber", "order_number", "payment_code", "paymentCode"})
        private String orderNumber;

        @JsonProperty("content")
        @JsonAlias({"description", "transfer_content", "transferContent", "addInfo"})
        private String content;

        @JsonProperty("transaction_id")
        @JsonAlias({"transactionId", "transaction_id", "transactionReference", "transaction_reference", "refNo", "reference_number"})
        private String transactionId;

        private BigDecimal amount;

        @JsonProperty("transfer_type")
        @JsonAlias({"transferType", "type"})
        private String transferType;

        @JsonProperty("raw_payload")
        @JsonAlias({"rawPayload", "raw_payload"})
        private String rawPayload;
    }

    /**
     * Webhook nhận thông báo biến động thanh toán cổng trực tuyến
     * Bắt buộc xác thực nguồn thông qua Webhook Secret / HMAC-SHA256 Signature.
     */
    @PostMapping("/webhook")
    public PaymentWebhookResponse paymentWebhook(
            @RequestBody(required = false) String rawBody,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader,
            @RequestHeader(value = "X-Signature", required = false) String signatureHeader
    ) {
        WebhookRequest request = null;
        if (rawBody != null && !rawBody.isBlank()) {
            try {
                request = objectMapper.readValue(rawBody, WebhookRequest.class);
            } catch (Exception e) {
                log.warn("Không thể deserialize body webhook sang WebhookRequest: {}", e.getMessage());
            }
        }
        return paymentService.processPaymentWebhook(request, authHeader, secretHeader, signatureHeader, rawBody);
    }
}
