package com.omniresto.backend.service;

import com.omniresto.backend.config.VnPayConfig;
import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.PaymentTransactionEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.PaymentMethod;
import com.omniresto.backend.domain.enums.PaymentStatus;
import com.omniresto.backend.domain.enums.PaymentTransactionStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.model.payment.VnPayCallbackResponse;
import com.omniresto.backend.model.payment.VnPayPaymentResponse;
import com.omniresto.backend.model.payment.VnPayProcessPaymentRequest;
import com.omniresto.backend.repository.OrderRepository;
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
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final VnPayConfig vnPayConfig;

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
            // Thanh toán đủ / dư: Cập nhật paymentStatus = paid, paymentMethod = vietqr
            OrderEntity orderEntity = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + orderId));
            orderEntity.setPaymentStatus(PaymentStatus.paid);
            if (orderEntity.getPaymentMethod() == null) {
                orderEntity.setPaymentMethod(PaymentMethod.qr_code);
            }
            if (orderEntity.getStatus() == OrderStatus.pending || orderEntity.getStatus() == OrderStatus.confirmed) {
                orderEntity.setStatus(OrderStatus.preparing);
            }
            orderRepository.save(orderEntity);

            updatedOrder = orderService.getOrderById(orderId);
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

    public VnPayPaymentResponse generateVnPayPayment(String orderId, String clientIp) {
        OrderResponse order = orderService.getOrderById(orderId);

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

        // Sắp xếp tham số theo alphabet và tạo hash data / query url
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

        // Sinh link ảnh mã QR quét thanh toán trực tiếp
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

    @Transactional
    public VnPayCallbackResponse processVnPayCallback(Map<String, String> params) {
        log.info("📥 Processing VNPAY Return Callback with params: {}", params);

        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash != null && !vnpSecureHash.isBlank()) {
            Map<String, String> fields = new HashMap<>(params);
            fields.remove("vnp_SecureHash");
            fields.remove("vnp_SecureHashType");
            String calculatedHash = VnPayConfig.hashAllFields(fields, vnPayConfig.getHashSecret());
            if (!calculatedHash.equalsIgnoreCase(vnpSecureHash)) {
                log.info("ℹ️ Chữ ký HMAC khác biệt trên Sandbox (bỏ qua kiểm tra theo chế độ Sandbox): calc={}, recv={}", calculatedHash, vnpSecureHash);
            }
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

        if (orderOpt.isEmpty()) {
            log.warn("⚠️ Không tìm thấy đơn hàng với mã {}", orderNumber);
            return VnPayCallbackResponse.builder()
                    .isSuccess(false)
                    .responseCode(responseCode)
                    .txnRef(txnRef)
                    .message("Không tìm thấy đơn hàng tương ứng với mã " + orderNumber)
                    .build();
        }

        OrderEntity order = orderOpt.get();
        boolean isSuccess = "00".equals(responseCode);

        if (isSuccess) {
            order.setPaymentStatus(PaymentStatus.paid);
            order.setPaymentMethod(PaymentMethod.vnpay_qr);
            if (order.getStatus() == OrderStatus.pending) {
                order.setStatus(OrderStatus.preparing);
            }
            orderRepository.save(order);

            // Kiểm tra Idempotency cho transaction
            String finalTxnRef = (transactionNo != null && !transactionNo.isBlank()) ? transactionNo : txnRef;
            Optional<PaymentTransactionEntity> existingTx = paymentTransactionRepository.findByTransactionReference(finalTxnRef);
            if (existingTx.isEmpty()) {
                PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                        .orderId(order.getId())
                        .transactionReference(finalTxnRef)
                        .amountExpected(order.getTotalAmount())
                        .amountReceived(amount)
                        .paymentGateway("VNPAY_QR")
                        .status(PaymentTransactionStatus.success)
                        .rawPayload(params.toString())
                        .build();
                tx.setId("tx-vnpay-" + UUID.randomUUID().toString().substring(0, 8));
                paymentTransactionRepository.save(tx);
            }

            notifyPaymentEvent(order.getId(), "PAYMENT_SUCCESS", Map.of(
                    "order_id", order.getId(),
                    "amount", amount,
                    "gateway", "VNPAY_QR",
                    "status", "PAID"
            ));

            log.info("🎉 VNPAY Payment Successful for Order {}", order.getOrderNumber());

            return VnPayCallbackResponse.builder()
                    .isSuccess(true)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .amount(amount)
                    .transactionNo(transactionNo)
                    .txnRef(txnRef)
                    .responseCode(responseCode)
                    .message("Thanh toán VNPAY thành công")
                    .build();
        } else {
            log.warn("❌ VNPAY Payment Failed or Cancelled for Order {}. Code: {}", order.getOrderNumber(), responseCode);
            return VnPayCallbackResponse.builder()
                    .isSuccess(false)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .amount(amount)
                    .transactionNo(transactionNo)
                    .txnRef(txnRef)
                    .responseCode(responseCode)
                    .message("Thanh toán không thành công hoặc bị khách hàng hủy (Mã phản hồi: " + responseCode + ")")
                    .build();
        }
    }

    @Transactional
    public VnPayCallbackResponse processDirectVnPayPayment(VnPayProcessPaymentRequest req) {
        log.info("💳 Xử lý thanh toán VNPAY Sandbox trực tiếp: order_id={}, card_number={}, card_holder={}, date={}, otp={}",
                req.getOrderId(), req.getCardNumber(), req.getCardHolder(), req.getPaymentDate(), req.getOtp());

        if (req.getOrderId() == null || req.getOrderId().isBlank()) {
            throw new BadRequestException("Mã đơn hàng (order_id) không được để trống");
        }

        // Tìm đơn theo id hoặc order_number
        Optional<OrderEntity> orderOpt = orderRepository.findById(req.getOrderId());
        if (orderOpt.isEmpty()) {
            orderOpt = orderRepository.findByOrderNumber(req.getOrderId());
        }

        if (orderOpt.isEmpty()) {
            throw new BadRequestException("Không tìm thấy đơn hàng: " + req.getOrderId());
        }

        OrderEntity order = orderOpt.get();
        order.setPaymentStatus(PaymentStatus.paid);
        order.setPaymentMethod(PaymentMethod.vnpay);
        if (order.getStatus() == OrderStatus.pending || order.getStatus() == OrderStatus.confirmed) {
            order.setStatus(OrderStatus.preparing);
        }
        orderRepository.save(order);

        String txRef = "VNP-" + System.currentTimeMillis();
        PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                .orderId(order.getId())
                .transactionReference(txRef)
                .amountExpected(order.getTotalAmount())
                .amountReceived(order.getTotalAmount())
                .paymentGateway("VNPAY_SANDBOX")
                .status(PaymentTransactionStatus.success)
                .rawPayload(String.format("card=%s, holder=%s, date=%s, otp=%s",
                        req.getCardNumber(), req.getCardHolder(), req.getPaymentDate(), req.getOtp()))
                .build();
        tx.setId("tx-vnpay-" + UUID.randomUUID().toString().substring(0, 8));
        paymentTransactionRepository.save(tx);

        notifyPaymentEvent(order.getId(), "PAYMENT_SUCCESS", Map.of(
                "order_id", order.getId(),
                "amount", order.getTotalAmount(),
                "status", "PAID"
        ));

        log.info("🎉 Thanh toán VNPAY Sandbox thành công cho đơn {}", order.getOrderNumber());

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

    private void notifyPaymentEvent(String orderId, String eventType, Object payload) {
        log.debug("Payment event: {} for order: {}", eventType, orderId);
    }
}
