package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.config.VnPayConfig;
import com.omniresto.backend.controller.PaymentController;
import com.omniresto.backend.domain.*;
import com.omniresto.backend.domain.enums.*;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ConflictException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.exception.UnauthorizedException;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.model.payment.PaymentWebhookResponse;
import com.omniresto.backend.model.payment.VnPayCallbackResponse;
import com.omniresto.backend.model.payment.VnPayPaymentResponse;
import com.omniresto.backend.model.payment.VnPayProcessPaymentRequest;
import com.omniresto.backend.repository.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final OrderRepository orderRepository;
    private final TableSessionRepository tableSessionRepository;
    private final TableRepository tableRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OrderWebSocketHandler orderWebSocketHandler;
    private final ObjectMapper objectMapper;
    private final VnPayConfig vnPayConfig;

    @Value("${omniresto.payment.webhook-secret:OmniRestoWebhookSecret2026}")
    private String webhookSecret = "OmniRestoWebhookSecret2026";



    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentSettlementResult {
        private boolean success;
        private String message;
        private String orderId;
        private String orderNumber;
        private String tableSessionId;
        private String tableNo;
        private BigDecimal amountExpected;
        private BigDecimal amountReceived;
        private PaymentTransactionStatus transactionStatus;
        private String transactionReference;
    }

    private OrderEntity findOrder(String orderIdentifier) {
        Optional<OrderEntity> orderOpt = orderRepository.findById(orderIdentifier);
        if (orderOpt.isEmpty()) {
            orderOpt = orderRepository.findByOrderNumber(orderIdentifier);
        }
        return orderOpt.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + orderIdentifier));
    }


    public PaymentStatusResponse getPaymentStatus(String orderId) {
        OrderEntity order = findOrder(orderId);
        List<PaymentTransactionEntity> txList = paymentTransactionRepository.findByOrderId(order.getId());

        boolean isPaid = order.getPaymentStatus() == PaymentStatus.paid;

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

    // ── XÁC THỰC BẢO MẬT WEBHOOK (HMAC-SHA256 & Constant-time comparison) ──

    public boolean verifyWebhookAuthentication(String authHeader, String secretHeader, String signatureHeader, String rawPayload) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("⚠️ Webhook secret chưa được cấu hình! Từ chối request vì lý do an toàn.");
            return false;
        }

        // 1. Kiểm tra header X-Webhook-Secret
        if (secretHeader != null && !secretHeader.isBlank()) {
            if (MessageDigest.isEqual(
                    secretHeader.trim().getBytes(StandardCharsets.UTF_8),
                    webhookSecret.getBytes(StandardCharsets.UTF_8))) {
                return true;
            }
        }

        // 2. Kiểm tra header Authorization (Bearer <token> hoặc Apikey <token>)
        if (authHeader != null && !authHeader.isBlank()) {
            String token = authHeader.trim();
            if (token.startsWith("Bearer ")) {
                token = token.substring(7).trim();
            } else if (token.startsWith("Apikey ")) {
                token = token.substring(7).trim();
            }
            if (MessageDigest.isEqual(
                    token.getBytes(StandardCharsets.UTF_8),
                    webhookSecret.getBytes(StandardCharsets.UTF_8))) {
                return true;
            }
        }

        // 3. Kiểm tra chữ ký HMAC-SHA256 (X-Signature)
        if (signatureHeader != null && !signatureHeader.isBlank() && rawPayload != null) {
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] hash = mac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
                StringBuilder hex = new StringBuilder();
                for (byte b : hash) {
                    hex.append(String.format("%02x", b));
                }
                if (MessageDigest.isEqual(
                        hex.toString().getBytes(StandardCharsets.UTF_8),
                        signatureHeader.trim().toLowerCase().getBytes(StandardCharsets.UTF_8))) {
                    return true;
                }
            } catch (Exception e) {
                log.error("Lỗi khi kiểm tra chữ ký HMAC-SHA256: {}", e.getMessage());
            }
        }

        return false;
    }

    private String extractOrderIdentifier(String orderId, String orderNumber, String content) {
        if (orderId != null && !orderId.isBlank()) {
            return orderId.trim();
        }
        if (orderNumber != null && !orderNumber.isBlank()) {
            return orderNumber.trim();
        }
        if (content != null && !content.isBlank()) {
            Matcher matcher = Pattern.compile("(?i)(ORD-[A-Za-z0-9-]+)").matcher(content);
            if (matcher.find()) {
                return matcher.group(1).toUpperCase();
            }
            Matcher matcherOmni = Pattern.compile("(?i)OMNIRESTO\\s+([A-Za-z0-9-]+)").matcher(content);
            if (matcherOmni.find()) {
                return matcherOmni.group(1).trim();
            }
        }
        return null;
    }

    @Transactional
    public PaymentWebhookResponse processPaymentWebhook(
            PaymentController.WebhookRequest request,
            String authHeader,
            String secretHeader,
            String signatureHeader,
            String rawPayload
    ) {
        // 1. Xác thực nguồn (Bảo mật Webhook)
        boolean isAuthorized = verifyWebhookAuthentication(authHeader, secretHeader, signatureHeader, rawPayload);
        if (!isAuthorized) {
            log.warn("🚨 [SECURITY] Phát hiện request gọi webhook thanh toán giả mạo hoặc sai Secret! Auth: {}, Secret: {}, Sig: {}",
                    authHeader != null ? "[CÓ]" : "[KHÔNG]",
                    secretHeader != null ? "[CÓ]" : "[KHÔNG]",
                    signatureHeader != null ? "[CÓ]" : "[KHÔNG]");
            throw new UnauthorizedException("Xác thực Webhook thất bại: Secret hoặc chữ ký bảo mật không hợp lệ!");
        }

        if (request == null) {
            throw new BadRequestException("Dữ liệu webhook không được để trống!");
        }

        // Bỏ qua nếu giao dịch là tiền ra (transfer_type=out)
        if ("out".equalsIgnoreCase(request.getTransferType())) {
            log.info("ℹ️ Bỏ qua webhook giao dịch tiền ra (transfer_type=out). Tx: {}", request.getTransactionId());
            return PaymentWebhookResponse.builder()
                    .success(true)
                    .message("Bỏ qua giao dịch tiền ra")
                    .transactionReference(request.getTransactionId())
                    .status("IGNORED")
                    .build();
        }

        // 2. Trích xuất mã đơn hàng
        String orderIdentifier = extractOrderIdentifier(request.getOrderId(), request.getOrderNumber(), request.getContent());
        if (orderIdentifier == null || orderIdentifier.isBlank()) {
            throw new BadRequestException("Không thể nhận diện mã đơn hàng (order_id, order_number hoặc nội dung chuyển khoản) từ dữ liệu webhook!");
        }

        String txRef = (request.getTransactionId() != null && !request.getTransactionId().isBlank())
                ? request.getTransactionId().trim()
                : "TXN-" + System.currentTimeMillis();

        BigDecimal amount = (request.getAmount() != null) ? request.getAmount() : BigDecimal.ZERO;

        PaymentSettlementResult settlement = completePayment(
                orderIdentifier,
                "ONLINE_WEBHOOK",
                txRef,
                amount,
                PaymentMethod.qr_code,
                rawPayload != null ? rawPayload : request.toString(),
                true
        );

        String finalStatus = "PAID";
        if (settlement.getTransactionStatus() != null) {
            finalStatus = (settlement.getTransactionStatus() == PaymentTransactionStatus.success)
                    ? "PAID"
                    : settlement.getTransactionStatus().name().toUpperCase();
        }

        return PaymentWebhookResponse.builder()
                .success(settlement.isSuccess())
                .message(settlement.getMessage())
                .orderId(settlement.getOrderId())
                .orderNumber(settlement.getOrderNumber())
                .tableNo(settlement.getTableNo())
                .transactionReference(settlement.getTransactionReference())
                .amountReceived(settlement.getAmountReceived())
                .status(finalStatus)
                .build();
    }

    // Overload duy trì tương thích ngược cho unit test
    @Transactional
    public OrderResponse handlePaymentWebhook(String orderId, String transactionReference, Double amountPaid) {
        return handlePaymentWebhook(orderId, transactionReference, amountPaid, null);
    }

    @Transactional
    public OrderResponse handlePaymentWebhook(String orderId, String transactionReference, Double amountPaid, String rawPayload) {
        completePayment(
                orderId,
                "ONLINE_WEBHOOK",
                transactionReference,
                amountPaid != null ? BigDecimal.valueOf(amountPaid) : BigDecimal.ZERO,
                PaymentMethod.qr_code,
                rawPayload,
                true
        );
        OrderEntity order = findOrder(orderId);
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setTotalAmount(order.getTotalAmount());
        return response;
    }

    // ── HÀM HOÀN TẤT THANH TOÁN DUY NHẤT TOÀN HỆ THỐNG (SINGLE SOURCE OF TRUTH) ──

    @Transactional
    public PaymentSettlementResult completePayment(
            String orderIdentifier,
            String source,
            String transactionReference,
            BigDecimal amountReceived,
            PaymentMethod paymentMethod,
            String rawPayload,
            boolean forceConfirm
    ) {
        if (transactionReference == null || transactionReference.isBlank()) {
            transactionReference = "TXN-" + System.currentTimeMillis();
        }

        // 1. Kiểm tra Idempotency chống xử lý lặp
        Optional<PaymentTransactionEntity> existingTx = paymentTransactionRepository.findByTransactionReference(transactionReference);
        if (existingTx.isPresent()) {
            log.warn("⚠️ [IDEMPOTENCY] Giao dịch {} đã được ghi nhận trước đó. Bỏ qua xử lý lặp.", transactionReference);
            PaymentTransactionEntity tx = existingTx.get();
            return PaymentSettlementResult.builder()
                    .success(true)
                    .message("Giao dịch đã được ghi nhận trước đó (Idempotent OK)")
                    .transactionReference(transactionReference)
                    .orderId(tx.getOrderId())
                    .amountReceived(tx.getAmountReceived())
                    .transactionStatus(tx.getStatus())
                    .build();
        }

        // 2. Tra cứu đơn hàng
        Optional<OrderEntity> orderOpt = orderRepository.findById(orderIdentifier);
        if (orderOpt.isEmpty()) {
            orderOpt = orderRepository.findByOrderNumber(orderIdentifier);
        }
        if (orderOpt.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng tương ứng với mã: " + orderIdentifier);
        }
        OrderEntity order = orderOpt.get();

        // 3. Phân nhánh: Đơn ăn tại bàn (Dine-in Session) vs Đơn mang về (Takeaway)
        if (order.getTableSessionId() != null && !order.getTableSessionId().isBlank()) {
            TableSessionEntity session = tableSessionRepository.findByIdWithLock(order.getTableSessionId())
                    .orElse(null);

            if (session == null || session.getStatus() == TableSessionStatus.closed) {
                // Phiên bàn đã đóng trước đó -> Ghi nhận thanh toán dư / trùng lặp (Overpaid / Duplicate)
                log.warn("⚠️ [AUDIT] Nhận thanh toán cho bàn đã đóng phiên (Order #{}, Session {}). Ghi nhận giao dịch đối soát hoàn tiền.",
                        order.getOrderNumber(), order.getTableSessionId());

                BigDecimal expected = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal received = amountReceived != null ? amountReceived : BigDecimal.ZERO;

                PaymentTransactionEntity duplicateTx = PaymentTransactionEntity.builder()
                        .orderId(order.getId())
                        .transactionReference(transactionReference)
                        .amountExpected(expected)
                        .amountReceived(received)
                        .paymentGateway(paymentMethod != null ? paymentMethod.name() : source)
                        .status(PaymentTransactionStatus.overpaid)
                        .rawPayload((rawPayload != null ? rawPayload : "") + " [SESSION_ALREADY_CLOSED]")
                        .build();
                duplicateTx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
                try {
                    paymentTransactionRepository.save(duplicateTx);
                } catch (DataIntegrityViolationException ex) {
                    log.warn("Race condition on saving duplicate tx: {}", ex.getMessage());
                }

                sendWebSocketEvent("PAYMENT_DUPLICATE_ALERT", Map.of(
                        "order_id", order.getId(),
                        "order_number", order.getOrderNumber(),
                        "table_no", order.getTableNo() != null ? order.getTableNo() : "N/A",
                        "amount", received,
                        "transaction_reference", transactionReference,
                        "message", "Khách hàng chuyển khoản cho bàn đã thanh toán/đóng phiên trước đó. Vui lòng đối soát và hoàn tiền nếu cần!"
                ));

                return PaymentSettlementResult.builder()
                        .success(true)
                        .message("Giao dịch được ghi nhận cho phiên đã đóng. Vui lòng đối soát hoàn tiền.")
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .tableSessionId(order.getTableSessionId())
                        .tableNo(order.getTableNo())
                        .amountExpected(expected)
                        .amountReceived(received)
                        .transactionStatus(PaymentTransactionStatus.overpaid)
                        .transactionReference(transactionReference)
                        .build();
            }

            // Phiên bàn đang mở (active / payment_requested / payment_pending)
            List<OrderEntity> sessionOrders = orderRepository.findByTableSessionIdOrderByCreatedAtDesc(session.getId());
            List<OrderEntity> openOrders = sessionOrders.stream()
                    .filter(o -> o.getStatus() != OrderStatus.cancelled && (o.getStatus() != OrderStatus.completed || o.getPaymentStatus() != PaymentStatus.paid))
                    .toList();
            if (openOrders.isEmpty()) {
                openOrders = sessionOrders.stream()
                        .filter(o -> o.getStatus() != OrderStatus.cancelled)
                        .toList();
            }

            BigDecimal totalExpected = openOrders.stream()
                    .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal received = (amountReceived != null && amountReceived.compareTo(BigDecimal.ZERO) > 0)
                    ? amountReceived : totalExpected;

            // Kiểm tra THIẾU TIỀN (UNDERPAID)
            if (received.compareTo(totalExpected) < 0) {
                log.warn("⚠️ [AUDIT] Thanh toán THIẾU TIỀN cho bàn {}: Cần {}đ, nhận {}đ cho đơn {}",
                        session.getTableNo(), totalExpected, received, order.getOrderNumber());

                PaymentTransactionEntity underpaidTx = PaymentTransactionEntity.builder()
                        .orderId(order.getId())
                        .transactionReference(transactionReference)
                        .amountExpected(totalExpected)
                        .amountReceived(received)
                        .paymentGateway(paymentMethod != null ? paymentMethod.name() : source)
                        .status(PaymentTransactionStatus.underpaid)
                        .rawPayload(rawPayload)
                        .build();
                underpaidTx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
                try {
                    paymentTransactionRepository.save(underpaidTx);
                } catch (DataIntegrityViolationException ex) {
                    log.warn("Race condition on saving underpaid tx: {}", ex.getMessage());
                }

                sendWebSocketEvent("PAYMENT_UNDERPAID", Map.of(
                        "order_id", order.getId(),
                        "order_number", order.getOrderNumber(),
                        "table_no", session.getTableNo(),
                        "expected_amount", totalExpected,
                        "received_amount", received,
                        "remaining_amount", totalExpected.subtract(received),
                        "transaction_reference", transactionReference,
                        "status", "UNDERPAID"
                ));

                return PaymentSettlementResult.builder()
                        .success(false)
                        .message("Thanh toán thiếu tiền: Cần " + totalExpected.toBigInteger() + "đ nhưng chỉ nhận được " + received.toBigInteger() + "đ")
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .tableSessionId(session.getId())
                        .tableNo(session.getTableNo())
                        .amountExpected(totalExpected)
                        .amountReceived(received)
                        .transactionStatus(PaymentTransactionStatus.underpaid)
                        .transactionReference(transactionReference)
                        .build();
            }

            // ĐỦ HOẶC THỪA TIỀN (SUCCESS / OVERPAID)
            List<OrderItemEntity> unservedItems = openOrders.stream()
                    .flatMap(o -> orderItemRepository.findByOrder_Id(o.getId()).stream())
                    .filter(it -> it.getStatus() != OrderItemStatus.served && it.getStatus() != OrderItemStatus.cancelled)
                    .toList();

            if (!unservedItems.isEmpty()) {
                String unservedSummary = unservedItems.stream()
                        .map(it -> it.getItemName() + " (SL: " + it.getQuantity() + " - " + it.getStatus() + ")")
                        .distinct()
                        .collect(Collectors.joining(", "));

                String tableLabel = session.getTableNo() != null && session.getTableNo().startsWith("Bàn")
                        ? session.getTableNo()
                        : "Bàn " + session.getTableNo();

                if (source.startsWith("STAFF_POS") && !forceConfirm) {
                    throw new ConflictException(
                            tableLabel + " còn " + unservedItems.size() + " món chưa hoàn tất phục vụ (chưa SERVED): ["
                                    + unservedSummary + "]. Vui lòng xác nhận đã trả món hoặc truyền cờ forceConfirm=true để thu ngân bỏ qua cảnh báo này!"
                    );
                }

                log.warn("⚠️ [AUDIT] Thanh toán [{}] hoàn tất cho {} khi còn {} món chưa SERVED: [{}]. Tự động hoàn tất trả món.",
                        source, tableLabel, unservedItems.size(), unservedSummary);
            }

            // Cập nhật tất cả các đơn của session
            for (OrderEntity o : openOrders) {
                o.setPaymentStatus(PaymentStatus.paid);
                o.setStatus(OrderStatus.completed);
                if (paymentMethod != null) {
                    o.setPaymentMethod(paymentMethod);
                }
                List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(o.getId());
                for (OrderItemEntity it : items) {
                    if (it.getStatus() != OrderItemStatus.cancelled && it.getStatus() != OrderItemStatus.served) {
                        it.setStatus(OrderItemStatus.served);
                        it.setConfirmedAt(LocalDateTime.now());
                        orderItemRepository.save(it);
                    }
                }
                orderRepository.save(o);
            }

            // Đóng phiên bàn
            LocalDateTime now = LocalDateTime.now();
            session.setStatus(TableSessionStatus.closed);
            session.setClosedAt(now);
            tableSessionRepository.save(session);

            // Chuyển bàn sang CLEANING
            Optional<TableEntity> tableOpt = tableRepository.findById(session.getTableId());
            tableOpt.ifPresent(t -> {
                t.setStatus(TableStatus.cleaning);
                t.setCurrentOrderId(null);
                tableRepository.save(t);
                sendWebSocketEvent("TABLE_STATUS_CHANGED", Map.of(
                        "table_id", t.getId(),
                        "table_no", t.getTableNo(),
                        "status", TableStatus.cleaning
                ));
            });

            PaymentTransactionStatus txStatus = (received.compareTo(totalExpected) > 0)
                    ? PaymentTransactionStatus.overpaid
                    : PaymentTransactionStatus.success;

            PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                    .orderId(order.getId())
                    .transactionReference(transactionReference)
                    .amountExpected(totalExpected)
                    .amountReceived(received)
                    .paymentGateway(paymentMethod != null ? paymentMethod.name() : source)
                    .status(txStatus)
                    .rawPayload(rawPayload != null ? rawPayload : "Settled via " + source)
                    .build();
            tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
            try {
                paymentTransactionRepository.save(tx);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Race condition on saving payment tx: {}", ex.getMessage());
            }

            // Bắn WebSocket thông báo đóng phiên bàn và thanh toán thành công
            sendWebSocketEvent("TABLE_SESSION_CLOSED", Map.of(
                    "table_id", session.getTableId(),
                    "table_no", session.getTableNo(),
                    "session_token", session.getSessionToken(),
                    "closed_at", now.toString(),
                    "reason", "PAYMENT_COMPLETED_" + source
            ));

            sendWebSocketEvent("PAYMENT_SUCCESS", Map.of(
                    "order_id", order.getId(),
                    "order_number", order.getOrderNumber(),
                    "table_no", session.getTableNo(),
                    "amount", received,
                    "transaction_reference", transactionReference,
                    "status", "PAID"
            ));

            if (txStatus == PaymentTransactionStatus.overpaid) {
                sendWebSocketEvent("PAYMENT_OVERPAID", Map.of(
                        "order_id", order.getId(),
                        "order_number", order.getOrderNumber(),
                        "table_no", session.getTableNo(),
                        "expected_amount", totalExpected,
                        "received_amount", received,
                        "excess_amount", received.subtract(totalExpected),
                        "transaction_reference", transactionReference
                ));
                log.warn("⚠️ [AUDIT] Khách thanh toán DƯ TIỀN cho bàn {}: Cần {}đ, nhận {}đ [Chênh lệch: +{}đ]",
                        session.getTableNo(), totalExpected, received, received.subtract(totalExpected));
            }

            log.info("✅ [AUDIT] Hoàn tất thanh toán thành công cho bàn {} qua nguồn {} [Tx: {}, Cần: {}đ, Nhận: {}đ]",
                    session.getTableNo(), source, transactionReference, totalExpected, received);

            return PaymentSettlementResult.builder()
                    .success(true)
                    .message(txStatus == PaymentTransactionStatus.overpaid
                            ? "Thanh toán thành công (Khách thanh toán dư " + received.subtract(totalExpected).toBigInteger() + "đ)"
                            : "Thanh toán thành công")
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .tableSessionId(session.getId())
                    .tableNo(session.getTableNo())
                    .amountExpected(totalExpected)
                    .amountReceived(received)
                    .transactionStatus(txStatus)
                    .transactionReference(transactionReference)
                    .build();
        } else {
            // Đơn mang về / Giao hàng (Take-away)
            BigDecimal expected = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal received = (amountReceived != null && amountReceived.compareTo(BigDecimal.ZERO) > 0)
                    ? amountReceived : expected;

            if (received.compareTo(expected) < 0) {
                PaymentTransactionEntity underpaidTx = PaymentTransactionEntity.builder()
                        .orderId(order.getId())
                        .transactionReference(transactionReference)
                        .amountExpected(expected)
                        .amountReceived(received)
                        .paymentGateway(paymentMethod != null ? paymentMethod.name() : source)
                        .status(PaymentTransactionStatus.underpaid)
                        .rawPayload(rawPayload)
                        .build();
                underpaidTx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
                try {
                    paymentTransactionRepository.save(underpaidTx);
                } catch (DataIntegrityViolationException ex) {
                    log.warn("Race condition on saving underpaid tx: {}", ex.getMessage());
                }

                sendWebSocketEvent("PAYMENT_UNDERPAID", Map.of(
                        "order_id", order.getId(),
                        "order_number", order.getOrderNumber(),
                        "expected_amount", expected,
                        "received_amount", received,
                        "remaining_amount", expected.subtract(received),
                        "transaction_reference", transactionReference,
                        "status", "UNDERPAID"
                ));

                return PaymentSettlementResult.builder()
                        .success(false)
                        .message("Thanh toán thiếu tiền cho đơn #" + order.getOrderNumber())
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .amountExpected(expected)
                        .amountReceived(received)
                        .transactionStatus(PaymentTransactionStatus.underpaid)
                        .transactionReference(transactionReference)
                        .build();
            }

            order.setPaymentStatus(PaymentStatus.paid);
            if (paymentMethod != null) {
                order.setPaymentMethod(paymentMethod);
            }
            if (order.getStatus() == OrderStatus.pending || order.getStatus() == OrderStatus.confirmed) {
                order.setStatus(OrderStatus.preparing);
            }
            orderRepository.save(order);

            PaymentTransactionStatus txStatus = (received.compareTo(expected) > 0)
                    ? PaymentTransactionStatus.overpaid
                    : PaymentTransactionStatus.success;

            PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                    .orderId(order.getId())
                    .transactionReference(transactionReference)
                    .amountExpected(expected)
                    .amountReceived(received)
                    .paymentGateway(paymentMethod != null ? paymentMethod.name() : source)
                    .status(txStatus)
                    .rawPayload(rawPayload)
                    .build();
            tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
            try {
                paymentTransactionRepository.save(tx);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Race condition saving tx: {}", ex.getMessage());
            }

            sendWebSocketEvent("PAYMENT_SUCCESS", Map.of(
                    "order_id", order.getId(),
                    "order_number", order.getOrderNumber(),
                    "amount", received,
                    "transaction_reference", transactionReference,
                    "status", "PAID"
            ));

            return PaymentSettlementResult.builder()
                    .success(true)
                    .message("Thanh toán thành công cho đơn #" + order.getOrderNumber())
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .amountExpected(expected)
                    .amountReceived(received)
                    .transactionStatus(txStatus)
                    .transactionReference(transactionReference)
                    .build();
        }
    }

    // ── VNPAY INTEGRATION ──────────────────────────────────────────────────

    public VnPayPaymentResponse generateVnPayPayment(String orderId, String clientIp) {
        OrderEntity order = findOrder(orderId);

        BigDecimal totalAmount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        long amountInVndCents = totalAmount.multiply(new BigDecimal(100)).longValue();

        String txnRef = order.getOrderNumber() + "_" + System.currentTimeMillis();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnPayConfig.getVersion());
        vnpParams.put("vnp_Command", vnPayConfig.getCommand());
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountInVndCents));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_BankCode", "VNPAYQR");
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + order.getOrderNumber());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", clientIp != null && !clientIp.isBlank() ? clientIp : "127.0.0.1");
        vnpParams.put("vnp_CreateDate", VnPayConfig.getCurrentTimeString());
        vnpParams.put("vnp_ExpireDate", VnPayConfig.getExpireTimeString(15));

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                try {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString())).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                } catch (Exception e) {
                    hashData.append(fieldName).append('=').append(fieldValue);
                    query.append(fieldName).append('=').append(fieldValue);
                }
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String secureHash = VnPayConfig.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        String paymentUrl = vnPayConfig.getVnpUrl() + "?" + query.toString() + "&vnp_SecureHash=" + secureHash;

        String qrImageUrl;
        try {
            qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + URLEncoder.encode(paymentUrl, StandardCharsets.UTF_8.toString());
        } catch (Exception e) {
            qrImageUrl = paymentUrl;
        }

        log.info("💳 Generated VNPAY QR Payment for Order {}: {}", order.getOrderNumber(), paymentUrl);

        return VnPayPaymentResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .amount(totalAmount)
                .paymentUrl(paymentUrl)
                .qrImageUrl(qrImageUrl)
                .txnRef(txnRef)
                .bankCode("VNPAYQR")
                .message("Khởi tạo mã thanh toán VNPAY-QR Sandbox thành công")
                .build();
    }

    /**
     * VNPAY Server-to-Server Instant Payment Notification (IPN)
     * Đây là nơi CHÍNH THỨC xác thực và cập nhật trạng thái thanh toán.
     */
    @Transactional
    public Map<String, String> processVnPayIpn(Map<String, String> params) {
        log.info("📥 Processing VNPAY Server-to-Server IPN: {}", params);

        // 1. Kiểm tra chữ ký Checksum
        String vnpSecureHash = params.get("vnp_SecureHash");
        Map<String, String> fields = new HashMap<>(params);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        String calculatedHash = VnPayConfig.hashAllFields(fields, vnPayConfig.getHashSecret());
        if (vnpSecureHash == null || !calculatedHash.equalsIgnoreCase(vnpSecureHash)) {
            log.warn("❌ VNPAY IPN Invalid Checksum: calc={}, recv={}", calculatedHash, vnpSecureHash);
            return Map.of("RspCode", "97", "Message", "Invalid Checksum");
        }

        // 2. Kiểm tra TMN Code
        String tmnCode = params.get("vnp_TmnCode");
        if (tmnCode == null || !tmnCode.equals(vnPayConfig.getTmnCode())) {
            log.warn("❌ VNPAY IPN Invalid TMN Code: {}", tmnCode);
            return Map.of("RspCode", "99", "Message", "Invalid TMN Code");
        }

        // 3. Tra cứu đơn hàng
        String txnRef = params.get("vnp_TxnRef");
        String orderNumber = (txnRef != null && txnRef.contains("_")) ? txnRef.split("_")[0] : txnRef;
        Optional<OrderEntity> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty() && orderNumber != null) {
            orderOpt = orderRepository.findById(orderNumber);
        }
        if (orderOpt.isEmpty()) {
            log.warn("❌ VNPAY IPN Order not Found: {}", orderNumber);
            return Map.of("RspCode", "01", "Message", "Order not Found");
        }
        OrderEntity order = orderOpt.get();

        // 4. Kiểm tra số tiền (VNPay tính x100)
        String amountStr = params.get("vnp_Amount");
        BigDecimal vnpAmount = (amountStr != null && !amountStr.isBlank())
                ? BigDecimal.valueOf(Double.parseDouble(amountStr) / 100)
                : BigDecimal.ZERO;
        BigDecimal expected = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        if (vnpAmount.compareTo(expected) != 0) {
            log.warn("❌ VNPAY IPN Invalid Amount: VNP={}, Expected={}", vnpAmount, expected);
            return Map.of("RspCode", "04", "Message", "Invalid Amount");
        }

        // 5. Kiểm tra đơn hàng đã được xác nhận thanh toán trước đó chưa
        if (order.getPaymentStatus() == PaymentStatus.paid) {
            log.info("ℹ️ VNPAY IPN Order already confirmed: {}", order.getOrderNumber());
            return Map.of("RspCode", "02", "Message", "Order already confirmed");
        }

        // 6. Xử lý kết quả giao dịch
        String responseCode = params.get("vnp_ResponseCode");
        String transactionNo = params.get("vnp_TransactionNo");
        String finalTxRef = (transactionNo != null && !transactionNo.isBlank()) ? transactionNo : txnRef;

        if ("00".equals(responseCode)) {
            completePayment(
                    order.getId(),
                    "VNPAY_IPN",
                    finalTxRef,
                    vnpAmount,
                    PaymentMethod.vnpay_qr,
                    params.toString(),
                    true
            );
            log.info("🎉 VNPAY IPN Hoàn tất thanh toán thành công cho đơn {}", order.getOrderNumber());
            return Map.of("RspCode", "00", "Message", "Confirm Success");
        } else {
            log.warn("⚠️ VNPAY IPN Giao dịch không thành công hoặc bị khách hủy (ResponseCode: {})", responseCode);
            PaymentTransactionEntity failedTx = PaymentTransactionEntity.builder()
                    .orderId(order.getId())
                    .transactionReference(finalTxRef)
                    .amountExpected(expected)
                    .amountReceived(BigDecimal.ZERO)
                    .paymentGateway("VNPAY_QR")
                    .status(PaymentTransactionStatus.failed)
                    .rawPayload(params.toString())
                    .build();
            failedTx.setId("tx-vnpay-" + UUID.randomUUID().toString().substring(0, 8));
            try {
                paymentTransactionRepository.save(failedTx);
            } catch (Exception ignored) {}

            return Map.of("RspCode", "00", "Message", "Confirm Success");
        }
    }

    /**
     * VNPAY Browser Return Callback (READ-ONLY)
     * Chỉ phục vụ hiển thị kết quả cho khách trên UI, không mutate database tại đây.
     */
    public VnPayCallbackResponse processVnPayCallback(Map<String, String> params) {
        log.info("📥 Processing VNPAY Return Callback (Read-Only) with params: {}", params);

        String vnpSecureHash = params.get("vnp_SecureHash");
        boolean signatureValid = false;
        if (vnpSecureHash != null && !vnpSecureHash.isBlank()) {
            Map<String, String> fields = new HashMap<>(params);
            fields.remove("vnp_SecureHash");
            fields.remove("vnp_SecureHashType");
            String calculatedHash = VnPayConfig.hashAllFields(fields, vnPayConfig.getHashSecret());
            signatureValid = calculatedHash.equalsIgnoreCase(vnpSecureHash);
        }

        String responseCode = params.get("vnp_ResponseCode");
        String txnRef = params.get("vnp_TxnRef");
        String transactionNo = params.get("vnp_TransactionNo");
        String amountStr = params.get("vnp_Amount");
        BigDecimal amount = (amountStr != null && !amountStr.isBlank())
                ? BigDecimal.valueOf(Double.parseDouble(amountStr) / 100)
                : BigDecimal.ZERO;

        String orderNumber = txnRef != null && txnRef.contains("_") ? txnRef.split("_")[0] : txnRef;
        Optional<OrderEntity> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty() && orderNumber != null) {
            orderOpt = orderRepository.findById(orderNumber);
        }

        String orderId = orderOpt.map(OrderEntity::getId).orElse(orderNumber);
        boolean isSuccess = "00".equals(responseCode) && signatureValid;

        return VnPayCallbackResponse.builder()
                .isSuccess(isSuccess)
                .orderId(orderId)
                .orderNumber(orderNumber)
                .amount(amount)
                .transactionNo(transactionNo)
                .txnRef(txnRef)
                .responseCode(responseCode)
                .message(isSuccess
                        ? "Thanh toán VNPAY thành công (Đang đồng bộ qua IPN)"
                        : "Thanh toán không thành công hoặc bị khách hàng hủy (Mã phản hồi: " + responseCode + ")")
                .build();
    }

    @Transactional
    public VnPayCallbackResponse processDirectVnPayPayment(VnPayProcessPaymentRequest req) {
        log.info("💳 Xử lý thanh toán VNPAY Sandbox trực tiếp: order_id={}, card={}", req.getOrderId(), req.getCardNumber());

        if (req.getOrderId() == null || req.getOrderId().isBlank()) {
            throw new BadRequestException("Mã đơn hàng (order_id) không được để trống");
        }

        Optional<OrderEntity> orderOpt = orderRepository.findById(req.getOrderId());
        if (orderOpt.isEmpty()) {
            orderOpt = orderRepository.findByOrderNumber(req.getOrderId());
        }
        if (orderOpt.isEmpty()) {
            throw new BadRequestException("Không tìm thấy đơn hàng: " + req.getOrderId());
        }

        OrderEntity order = orderOpt.get();
        String txRef = "VNP-" + System.currentTimeMillis();

        completePayment(
                order.getId(),
                "VNPAY_SANDBOX_DIRECT",
                txRef,
                order.getTotalAmount(),
                PaymentMethod.vnpay,
                String.format("card=%s, holder=%s, date=%s, otp=%s",
                        req.getCardNumber(), req.getCardHolder(), req.getPaymentDate(), req.getOtp()),
                true
        );

        return VnPayCallbackResponse.builder()
                .isSuccess(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .amount(order.getTotalAmount())
                .transactionNo(txRef)
                .txnRef(txRef)
                .responseCode("00")
                .message("Thanh toán VNPAY Sandbox thành công!")
                .build();
    }

    private void sendWebSocketEvent(String eventType, Object payload) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", eventType);
            message.put("timestamp", System.currentTimeMillis());
            if (payload instanceof Map) {
                message.putAll((Map<String, Object>) payload);
            } else {
                message.put("data", payload);
            }
            orderWebSocketHandler.broadcast(objectMapper.writeValueAsString(message));
        } catch (Exception e) {
            log.warn("⚠️ Không thể gửi WebSocket event {}: {}", eventType, e.getMessage());
        }
    }
}
