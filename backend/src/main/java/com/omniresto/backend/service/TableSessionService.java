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
@Transactional(readOnly = true)
public class TableSessionService {

    private final TableSessionRepository tableSessionRepository;
    private final TableRepository tableRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
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
                .findFirstByTableIdAndStatus(table.getId(), TableSessionStatus.active);

        if (activeSessionOpt.isPresent()) {
            TableSessionEntity existing = activeSessionOpt.get();
            // Check if expired
            if (existing.getExpiresAt().isBefore(LocalDateTime.now())) {
                existing.setStatus(TableSessionStatus.expired);
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
                .status(TableSessionStatus.active)
                .mode(mode != null ? mode : TableSessionMode.pay_after)
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

        return validateAndTouch(session);
    }

    @Transactional
    public TableSessionEntity validateAndTouchSessionWithLock(String sessionToken) {
        if (sessionToken == null || sessionToken.trim().isEmpty()) {
            throw new BadRequestException("Bắt buộc phải có phiên bàn hợp lệ (Header X-Table-Session). Quý khách vui lòng quét mã QR tại bàn để gọi món!");
        }

        TableSessionEntity session = tableSessionRepository.findBySessionTokenWithLock(sessionToken.trim())
                .orElseThrow(() -> new BadRequestException("Phiên bàn không tồn tại hoặc đã bị hủy. Vui lòng quét lại mã QR tại bàn!"));

        return validateAndTouch(session);
    }

    private TableSessionEntity validateAndTouch(TableSessionEntity session) {
        if (session.getStatus() != TableSessionStatus.active
                && session.getStatus() != TableSessionStatus.payment_pending
                && session.getStatus() != TableSessionStatus.payment_requested) {
            throw new BadRequestException("Phiên đặt món của " + session.getTableNo() + " đã kết thúc (" + session.getStatus() + "). Vui lòng quét lại mã QR tại bàn!");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(TableSessionStatus.expired);
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

        return mapToResponse(saved);
    }

    /**
     * Khách hàng hoặc Thu ngân yêu cầu thanh toán (Đóng băng hóa đơn & sinh VietQR cố định)
     */
    @Transactional
    public TableSessionResponse requestPayment(String sessionToken) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);

        if (session.getStatus() == TableSessionStatus.payment_requested) {
            // Idempotent: Nếu đã ở trạng thái này rồi thì trả về thông tin đóng băng hiện tại
            return mapToResponse(session);
        }

        if (session.getStatus() != TableSessionStatus.active && session.getStatus() != TableSessionStatus.payment_pending) {
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

        session.setStatus(TableSessionStatus.payment_requested);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("❄️ Table session {} for table {} is now PAYMENT_REQUESTED (frozen for payment)", saved.getId(), saved.getTableNo());

        return mapToResponse(saved);
    }

    /**
     * Khách hủy yêu cầu thanh toán (Rã đông hóa đơn để tiếp tục gọi thêm món)
     */
    @Transactional
    public TableSessionResponse cancelPaymentRequest(String sessionToken) {
        TableSessionEntity session = validateAndTouchSessionWithLock(sessionToken);

        if (session.getStatus() != TableSessionStatus.payment_requested) {
            throw new BadRequestException("Bàn hiện không ở trạng thái yêu cầu thanh toán!");
        }

        session.setStatus(TableSessionStatus.active);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("🔓 Table session {} for table {} cancelled payment request, back to ACTIVE", saved.getId(), saved.getTableNo());

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
                    .status(PaymentTransactionStatus.success)
                    .rawPayload("Staff confirmed: " + (staffId != null ? staffId : "POS"))
                    .build();
            tx.setId("tx-" + UUID.randomUUID().toString().substring(0, 8));
            paymentTransactionRepository.save(tx);

            order.setPaymentStatus(PaymentStatus.paid);
            order.setStatus(OrderStatus.completed);
            orderRepository.save(order);
        }

        session.setStatus(TableSessionStatus.paid);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("✅ Table session {} for table {} confirmed PAID", saved.getId(), saved.getTableNo());

        return mapToResponse(saved);
    }

    @Transactional
    public void closeSessionsForTable(String tableId, String reason) {
        List<TableSessionStatus> activeStatuses = List.of(
                TableSessionStatus.active,
                TableSessionStatus.payment_requested,
                TableSessionStatus.payment_pending,
                TableSessionStatus.paid
        );
        List<TableSessionEntity> sessions = tableSessionRepository.findByTableIdAndStatusIn(tableId, activeStatuses);

        if (!sessions.isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            sessions.forEach(s -> {
                s.setStatus(TableSessionStatus.closed);
                s.setClosedAt(now);
            });
            tableSessionRepository.saveAll(sessions);
            log.info("Closed {} sessions for table {} due to {}", sessions.size(), tableId, reason);
        }

        // Update table status back to available
        Optional<TableEntity> tableOpt = tableRepository.findById(tableId);
        tableOpt.ifPresent(t -> {
            t.setStatus(TableStatus.available);
            tableRepository.save(t);
            notifyTableStatusChanged(tableId, TableStatus.available);
        });
    }

    private void notifyTableStatusChanged(String tableId, TableStatus newStatus) {
        log.debug("Table status changed: {} -> {}", tableId, newStatus);
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
            if (entity.getStatus() == TableSessionStatus.payment_requested && order.getTotalAmount() != null) {
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

