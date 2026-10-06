package com.omniresto.backend.service;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.PaymentTransactionEntity;
import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.*;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.session.TableSessionResponse;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import com.omniresto.backend.repository.PaymentTransactionRepository;
import com.omniresto.backend.repository.TableRepository;
import com.omniresto.backend.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TableSessionService {

    private final TableSessionRepository tableSessionRepository;
    private final TableRepository tableRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // Configurable VietQR merchant credentials
    @Value("${vietqr.bank-id:MB}")
    private String bankId = "MB";

    @Value("${vietqr.account-number:0368295264}")
    private String accountNumber = "0368295264";

    @Value("${vietqr.account-name:NHAN HANG OMNIRESTO}")
    private String accountName = "NHAN HANG OMNIRESTO";

    @Value("${vietqr.template:compact2}")
    private String vietqrTemplate = "compact2";

    // Session lifetime default: 3 hours of inactivity
    public static final int SESSION_TIMEOUT_HOURS = 3;

    @Transactional
    public TableSessionResponse checkInOrJoin(String qrSecretToken, TableSessionMode mode) {
        if (qrSecretToken == null || qrSecretToken.trim().isEmpty()) {
            throw new BadRequestException("Mã QR bàn không được để trống!");
        }

        TableEntity table = tableRepository.findByQrSecretToken(qrSecretToken.trim())
                .or(() -> {
                    // Fallback: match by table ID if token includes tbl-XX or ban-XX
                    java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:tbl|ban)[_-]?0?(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(qrSecretToken.trim());
                    if (m.find()) {
                        String tblId = "tbl-" + Integer.parseInt(m.group(1));
                        Optional<TableEntity> opt = tableRepository.findById(tblId);
                        opt.ifPresent(t -> {
                            t.setQrSecretToken(qrSecretToken.trim());
                            tableRepository.save(t);
                        });
                        return opt;
                    }
                    return Optional.empty();
                })
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không hợp lệ hoặc bàn không tồn tại trong hệ thống!"));

        // Check if table already has an ACTIVE session
        Optional<TableSessionEntity> activeSessionOpt = tableSessionRepository
                .findFirstByTableIdAndStatus(table.getId(), TableSessionStatus.ACTIVE);

        if (activeSessionOpt.isPresent()) {
            TableSessionEntity existing = activeSessionOpt.get();
            // Check if expired
            if (existing.getExpiresAt().isBefore(LocalDateTime.now())) {
                existing.setStatus(TableSessionStatus.EXPIRED);
                tableSessionRepository.save(existing);
                log.info("Old session {} for table {} expired. Creating fresh session.", existing.getId(), table.getTableNo());
            } else {
                // Group join: Keep existing session token
                existing.setLastActivityAt(LocalDateTime.now());
                existing.setExpiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS));
                tableSessionRepository.save(existing);
                log.info("Client joined existing active session {} for table {}", existing.getId(), table.getTableNo());
                TableSessionResponse res = mapToResponse(existing);
                res.setMessage("Quý khách đã tham gia vào phiên gọi món đang diễn ra tại " + table.getTableNo());
                return res;
            }
        }

        // Create brand new TableSession
        String sessionId = "sess-" + UUID.randomUUID().toString().substring(0, 8);
        String sessionToken = "tok_" + UUID.randomUUID().toString().replace("-", "");

        TableSessionEntity newSession = TableSessionEntity.builder()
                .tableId(table.getId())
                .tableNo(table.getTableNo())
                .sessionToken(sessionToken)
                .status(TableSessionStatus.ACTIVE)
                .mode(mode != null ? mode : TableSessionMode.PAY_AFTER)
                .lastActivityAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS))
                .build();
        newSession.setId(sessionId);

        TableSessionEntity saved = tableSessionRepository.save(newSession);

        // Update table status to occupied if it was available or reserved
        if (table.getStatus() == TableStatus.available || table.getStatus() == TableStatus.reserved) {
            table.setStatus(TableStatus.occupied);
            tableRepository.save(table);
            notifyTableStatusChanged(table.getId(), TableStatus.occupied);
        }

        log.info("Created new table session {} for table {} with token {}", sessionId, table.getTableNo(), sessionToken);

        TableSessionResponse response = mapToResponse(saved);
        response.setMessage("Xác thực QR thành công! Phiên đặt món tại " + table.getTableNo() + " đã được kích hoạt.");
        return response;
    }

    @Transactional
    public TableSessionEntity validateAndTouchSession(String sessionToken) {
        if (sessionToken == null || sessionToken.trim().isEmpty()) {
            throw new BadRequestException("Bắt buộc phải có phiên bàn hợp lệ (Header X-Table-Session). Quý khách vui lòng quét mã QR tại bàn để gọi món!");
        }

        TableSessionEntity session = tableSessionRepository.findBySessionToken(sessionToken.trim())
                .orElseThrow(() -> new BadRequestException("Phiên bàn không tồn tại hoặc đã bị hủy. Vui lòng quét lại mã QR tại bàn!"));

        if (session.getStatus() != TableSessionStatus.ACTIVE
                && session.getStatus() != TableSessionStatus.PAYMENT_PENDING
                && session.getStatus() != TableSessionStatus.PAYMENT_REQUESTED) {
            throw new BadRequestException("Phiên đặt món của " + session.getTableNo() + " đã kết thúc (" + session.getStatus() + "). Vui lòng quét lại mã QR tại bàn!");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(TableSessionStatus.EXPIRED);
            tableSessionRepository.save(session);
            throw new BadRequestException("Phiên đặt món đã hết hạn do quá thời gian chờ. Vui lòng quét lại mã QR tại bàn!");
        }

        // Touch activity
        session.setLastActivityAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS));
        return tableSessionRepository.save(session);
    }

    @Transactional
    public TableSessionEntity validateAndTouchSessionWithLock(String sessionToken) {
        if (sessionToken == null || sessionToken.trim().isEmpty()) {
            throw new BadRequestException("Bắt buộc phải có phiên bàn hợp lệ (Header X-Table-Session). Quý khách vui lòng quét mã QR tại bàn để gọi món!");
        }

        TableSessionEntity session = tableSessionRepository.findBySessionTokenWithLock(sessionToken.trim())
                .orElseThrow(() -> new BadRequestException("Phiên bàn không tồn tại hoặc đã bị hủy. Vui lòng quét lại mã QR tại bàn!"));

        if (session.getStatus() != TableSessionStatus.ACTIVE
                && session.getStatus() != TableSessionStatus.PAYMENT_PENDING
                && session.getStatus() != TableSessionStatus.PAYMENT_REQUESTED) {
            throw new BadRequestException("Phiên đặt món của " + session.getTableNo() + " đã kết thúc (" + session.getStatus() + "). Vui lòng quét lại mã QR tại bàn!");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(TableSessionStatus.EXPIRED);
            tableSessionRepository.save(session);
            throw new BadRequestException("Phiên đặt món đã hết hạn do quá thời gian chờ. Vui lòng quét lại mã QR tại bàn!");
        }

        session.setLastActivityAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS));
        return tableSessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public TableSessionResponse getSessionByToken(String sessionToken) {
        TableSessionEntity session = tableSessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên với token cung cấp"));
        return mapToResponse(session);
    }

    /**
     * Xác thực phiên bàn bởi nhân viên nhà hàng (Chống đặt món ảo / quét QR từ xa)
     */
    @Transactional
    public TableSessionResponse verifySession(String sessionToken, String staffId) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);
        LocalDateTime now = LocalDateTime.now();
        session.setVerifiedAt(now);
        session.setVerifiedByStaffId((staffId != null && !staffId.isBlank()) ? staffId : "STAFF-POS");
        TableSessionEntity saved = tableSessionRepository.save(session);

        // Nếu bàn đang có đơn đợt 1 ở trạng thái pending, tự động duyệt sang preparing (bếp nhận lệnh nấu)
        Optional<OrderEntity> pendingOrderOpt = orderRepository
                .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(
                        saved.getId(),
                        List.of(OrderStatus.pending)
                );
        if (pendingOrderOpt.isPresent()) {
            OrderEntity order = pendingOrderOpt.get();
            order.setStatus(OrderStatus.confirmed);
            List<OrderItemEntity> items = orderItemRepository.findByOrder_Id(order.getId());
            for (OrderItemEntity it : items) {
                if (it.getStatus() == OrderItemStatus.pending) {
                    it.setStatus(OrderItemStatus.confirmed);
                    it.setConfirmedByStaffId(session.getVerifiedByStaffId());
                    it.setConfirmedAt(now);
                    orderItemRepository.save(it);
                }
            }
            orderRepository.save(order);
        }

        log.info("🛡️ Table session {} for table {} VERIFIED by staff {}", saved.getId(), saved.getTableNo(), staffId);

        try {
            messagingTemplate.convertAndSend("/topic/table-session/" + saved.getTableId(), Map.of(
                    "eventType", "TABLE_SESSION_VERIFIED",
                    "sessionToken", saved.getSessionToken(),
                    "tableId", saved.getTableId(),
                    "tableNo", saved.getTableNo(),
                    "verifiedAt", now.toString()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast session verified event: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    /**
     * Khách hàng hoặc Thu ngân yêu cầu thanh toán (Đóng băng hóa đơn & sinh VietQR cố định)
     */
    @Transactional
    public TableSessionResponse requestPayment(String sessionToken) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);

        if (session.getStatus() == TableSessionStatus.PAYMENT_REQUESTED) {
            // Idempotent: Nếu đã ở trạng thái này rồi thì trả về thông tin đóng băng hiện tại
            return mapToResponse(session);
        }

        if (session.getStatus() != TableSessionStatus.ACTIVE && session.getStatus() != TableSessionStatus.PAYMENT_PENDING) {
            throw new BadRequestException("Không thể yêu cầu thanh toán khi phiên bàn ở trạng thái: " + session.getStatus());
        }

        // Kiểm tra hóa đơn mở
        Optional<OrderEntity> activeOrderOpt = orderRepository
                .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(
                        session.getId(),
                        List.of(OrderStatus.pending, OrderStatus.confirmed, OrderStatus.preparing, OrderStatus.ready)
                );

        if (activeOrderOpt.isEmpty() || activeOrderOpt.get().getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Bàn hiện chưa có món nào cần thanh toán!");
        }

        session.setStatus(TableSessionStatus.PAYMENT_REQUESTED);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("❄️ Table session {} for table {} is now PAYMENT_REQUESTED (frozen for payment)", saved.getId(), saved.getTableNo());

        // Broadcast to POS / Cashier
        try {
            messagingTemplate.convertAndSend("/topic/tables", Map.of(
                    "eventType", "TABLE_PAYMENT_REQUESTED",
                    "tableId", saved.getTableId(),
                    "tableNo", saved.getTableNo(),
                    "sessionId", saved.getId(),
                    "orderNumber", activeOrderOpt.get().getOrderNumber(),
                    "totalAmount", activeOrderOpt.get().getTotalAmount()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast payment requested event: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    /**
     * Khách hủy yêu cầu thanh toán (Rã đông hóa đơn để tiếp tục gọi thêm món)
     */
    @Transactional
    public TableSessionResponse cancelPaymentRequest(String sessionToken) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);

        if (session.getStatus() != TableSessionStatus.PAYMENT_REQUESTED) {
            throw new BadRequestException("Bàn hiện không ở trạng thái yêu cầu thanh toán!");
        }

        session.setStatus(TableSessionStatus.ACTIVE);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("🔓 Table session {} for table {} cancelled payment request, back to ACTIVE", saved.getId(), saved.getTableNo());

        try {
            messagingTemplate.convertAndSend("/topic/tables", Map.of(
                    "eventType", "TABLE_PAYMENT_REQUEST_CANCELLED",
                    "tableId", saved.getTableId(),
                    "tableNo", saved.getTableNo(),
                    "sessionId", saved.getId()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast payment request cancelled event: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    /**
     * Nhân viên xác nhận đã nhận thanh toán (Tiền mặt / Thẻ POS / Webhook đối soát)
     */
    @Transactional
    public TableSessionResponse confirmPayment(String sessionToken, String staffId, PaymentMethod method, BigDecimal amountReceived) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);

        Optional<OrderEntity> activeOrderOpt = orderRepository
                .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(
                        session.getId(),
                        List.of(OrderStatus.pending, OrderStatus.confirmed, OrderStatus.preparing, OrderStatus.ready)
                );

        if (activeOrderOpt.isPresent()) {
            OrderEntity order = activeOrderOpt.get();
            BigDecimal expected = order.getTotalAmount();
            BigDecimal received = (amountReceived != null && amountReceived.compareTo(BigDecimal.ZERO) > 0) ? amountReceived : expected;

            PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                    .orderId(order.getId())
                    .transactionReference("TXN-" + System.currentTimeMillis())
                    .amountExpected(expected)
                    .amountReceived(received)
                    .paymentGateway(method != null ? method.name() : "CASH")
                    .status(PaymentTransactionStatus.SUCCESS)
                    .rawPayload("Staff confirmed: " + (staffId != null ? staffId : "POS"))
                    .build();
            tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
            paymentTransactionRepository.save(tx);

            order.setPaymentStatus(PaymentStatus.paid);
            order.setStatus(OrderStatus.completed);
            orderRepository.save(order);
        }

        session.setStatus(TableSessionStatus.PAID);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("✅ Table session {} for table {} confirmed PAID", saved.getId(), saved.getTableNo());

        try {
            messagingTemplate.convertAndSend("/topic/tables", Map.of(
                    "eventType", "TABLE_PAYMENT_CONFIRMED",
                    "tableId", saved.getTableId(),
                    "tableNo", saved.getTableNo(),
                    "sessionId", saved.getId()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast payment confirmed event: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void closeSessionsForTable(String tableId, String reason) {
        List<TableSessionEntity> activeSessions = tableSessionRepository.findByTableIdAndStatus(tableId, TableSessionStatus.ACTIVE);
        List<TableSessionEntity> requestedSessions = tableSessionRepository.findByTableIdAndStatus(tableId, TableSessionStatus.PAYMENT_REQUESTED);
        List<TableSessionEntity> pendingSessions = tableSessionRepository.findByTableIdAndStatus(tableId, TableSessionStatus.PAYMENT_PENDING);
        List<TableSessionEntity> paidSessions = tableSessionRepository.findByTableIdAndStatus(tableId, TableSessionStatus.PAID);

        LocalDateTime now = LocalDateTime.now();
        java.util.function.Consumer<TableSessionEntity> closeSession = s -> {
            s.setStatus(TableSessionStatus.CLOSED);
            s.setClosedAt(now);
            tableSessionRepository.save(s);
        };

        activeSessions.forEach(closeSession);
        requestedSessions.forEach(closeSession);
        pendingSessions.forEach(closeSession);
        paidSessions.forEach(closeSession);

        int totalClosed = activeSessions.size() + requestedSessions.size() + pendingSessions.size() + paidSessions.size();
        log.info("Closed {} sessions for table {} due to {}", totalClosed, tableId, reason);

        // Update table status back to available
        Optional<TableEntity> tableOpt = tableRepository.findById(tableId);
        tableOpt.ifPresent(t -> {
            t.setStatus(TableStatus.available);
            tableRepository.save(t);
            notifyTableStatusChanged(tableId, TableStatus.available);
        });

        // Broadcast session closed event to WebSocket
        try {
            messagingTemplate.convertAndSend("/topic/table-session/" + tableId, Map.of(
                    "eventType", "TABLE_SESSION_CLOSED",
                    "tableId", tableId,
                    "reason", reason,
                    "closedAt", now.toString()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast session closed event: {}", e.getMessage());
        }
    }

    private void notifyTableStatusChanged(String tableId, TableStatus newStatus) {
        try {
            messagingTemplate.convertAndSend("/topic/tables", Map.of(
                    "eventType", "TABLE_STATUS_CHANGED",
                    "tableId", tableId,
                    "status", newStatus.name()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast table status event: {}", e.getMessage());
        }
    }

    public TableSessionResponse mapToResponse(TableSessionEntity entity) {
        TableSessionResponse.TableSessionResponseBuilder builder = TableSessionResponse.builder()
                .id(entity.getId())
                .tableId(entity.getTableId())
                .tableNo(entity.getTableNo())
                .sessionToken(entity.getSessionToken())
                .status(entity.getStatus())
                .mode(entity.getMode())
                .verifiedAt(entity.getVerifiedAt())
                .isVerified(entity.isVerified())
                .verifiedByStaffId(entity.getVerifiedByStaffId())
                .createdAt(entity.getCreatedAt())
                .lastActivityAt(entity.getLastActivityAt())
                .expiresAt(entity.getExpiresAt());

        // Enriched info from active order
        Optional<OrderEntity> activeOrderOpt = orderRepository
                .findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(
                        entity.getId(),
                        List.of(OrderStatus.pending, OrderStatus.preparing, OrderStatus.ready, OrderStatus.completed)
                );

        if (activeOrderOpt.isPresent()) {
            OrderEntity order = activeOrderOpt.get();
            builder.activeOrderId(order.getId());
            builder.activeOrderNumber(order.getOrderNumber());
            builder.totalAmount(order.getTotalAmount());
            builder.paymentStatus(order.getPaymentStatus());

            // Nếu đang trong tiến trình yêu cầu thanh toán, tạo mã VietQR cố định
            if (entity.getStatus() == TableSessionStatus.PAYMENT_REQUESTED && order.getTotalAmount() != null) {
                String transferContent = "OMNIRESTO " + order.getOrderNumber();
                String encodedContent = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
                String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
                long amount = order.getTotalAmount().longValue();

                String qrUrl = String.format(
                        "https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s&accountName=%s",
                        bankId,
                        accountNumber,
                        vietqrTemplate,
                        amount,
                        encodedContent,
                        encodedAccountName
                );

                builder.vietQr(TableSessionResponse.VietQRInfo.builder()
                        .qrImageUrl(qrUrl)
                        .amount(order.getTotalAmount())
                        .bankId(bankId)
                        .accountNumber(accountNumber)
                        .accountName(accountName)
                        .transferContent(transferContent)
                        .build());
            }
        }

        return builder.build();
    }
}

