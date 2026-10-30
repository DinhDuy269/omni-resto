package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.PaymentTransactionEntity;
import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.*;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ConflictException;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final PaymentService paymentService;
    private final OrderWebSocketHandler orderWebSocketHandler;
    private final ActionLogService actionLogService;
    private final ObjectMapper objectMapper;


    // Session lifetime default: 3 hours of inactivity
    public static final int SESSION_TIMEOUT_HOURS = 3;

    @Transactional
    public TableSessionResponse checkInOrJoin(String qrSecretToken, String deviceToken, TableSessionMode mode) {
        if (qrSecretToken == null || qrSecretToken.trim().isEmpty()) {
            throw new BadRequestException("Mã QR bàn không được để trống!");
        }

        TableEntity table = tableRepository.findByQrSecretToken(qrSecretToken.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không hợp lệ hoặc bàn không tồn tại trong hệ thống!"));

        // Check if table already has an ACTIVE session (active, payment_requested, payment_pending)
        List<TableSessionStatus> activeStatuses = List.of(
                TableSessionStatus.active,
                TableSessionStatus.payment_requested,
                TableSessionStatus.payment_pending
        );
        List<TableSessionEntity> activeSessions = tableSessionRepository.findByTableIdAndStatusIn(table.getId(), activeStatuses);

        // Expire any sessions whose expiresAt has passed and flush immediately to release active_table_id constraint
        TableSessionEntity currentActive = null;
        for (TableSessionEntity ses : activeSessions) {
            if (ses.getExpiresAt() != null && ses.getExpiresAt().isBefore(LocalDateTime.now())) {
                ses.setStatus(TableSessionStatus.expired);
                ses.setClosedAt(LocalDateTime.now());
                tableSessionRepository.saveAndFlush(ses);
                log.info("Old session {} for table {} expired and flushed.", ses.getId(), table.getTableNo());
            } else if (currentActive == null) {
                currentActive = ses;
            }
        }

        if (currentActive != null) {
            // CHÍNH SÁCH BẢO MẬT SINGLE-DEVICE & KHÔI PHỤC PHIÊN BÀN:
            String cleanReqDeviceToken = (deviceToken != null) ? deviceToken.trim() : "";
            String existingDevToken = (currentActive.getDeviceToken() != null) ? currentActive.getDeviceToken().trim() : "";
            boolean isSameDevice = cleanReqDeviceToken.isEmpty() || existingDevToken.isEmpty() || cleanReqDeviceToken.equals(existingDevToken);

            if (isSameDevice) {
                currentActive.setLastActivityAt(LocalDateTime.now());
                currentActive.setExpiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS));
                if (existingDevToken.isEmpty() && !cleanReqDeviceToken.isEmpty()) {
                    currentActive.setDeviceToken(cleanReqDeviceToken);
                }
                TableSessionEntity saved = tableSessionRepository.save(currentActive);
                log.info("Device ({}) re-joined active table session {} for table {}", cleanReqDeviceToken, saved.getId(), table.getTableNo());

                TableSessionResponse res = mapToResponse(saved);
                res.setIsDeviceMaster(true);
                res.setMessage("Chào mừng bạn quay lại " + table.getTableNo() + "! Phiên đặt món của bạn đang hoạt động.");
                return res;
            }

            String tableDisplayName = table.getTableNo().startsWith("Bàn") ? table.getTableNo() : ("Bàn " + table.getTableNo());
            throw new ConflictException(tableDisplayName + " hiện đang có phiên đặt món đang hoạt động bởi thiết bị khác. Quý khách vui lòng liên hệ nhân viên nhà hàng để được hỗ trợ mở bàn!");
        }

        // Tạo phiên bàn mới an toàn cho bàn (đảm bảo độ dài <= 36 ký tự cho cột varchar(36))
        String sessionId = "sess-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        String sessionToken = "tok_" + UUID.randomUUID().toString().replace("-", "");
        String assignedDeviceToken = (deviceToken != null && !deviceToken.isBlank())
                ? deviceToken.trim()
                : "dev_" + UUID.randomUUID().toString().replace("-", "");

        TableSessionEntity newSession = TableSessionEntity.builder()
                .tableId(table.getId())
                .tableNo(table.getTableNo())
                .sessionToken(sessionToken)
                .deviceToken(assignedDeviceToken)
                .status(TableSessionStatus.active)
                .mode(mode != null ? mode : TableSessionMode.pay_after)
                .lastActivityAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(SESSION_TIMEOUT_HOURS))
                .build();
        newSession.setId(sessionId);

        TableSessionEntity saved = tableSessionRepository.save(newSession);

        // Update table status to occupied
        table.setStatus(TableStatus.occupied);
        tableRepository.save(table);
        notifyTableStatusChanged(table.getId(), TableStatus.occupied);

        log.info("Created new table session {} for table {} with deviceToken {}", sessionId, table.getTableNo(), assignedDeviceToken);

        TableSessionResponse response = mapToResponse(saved);
        response.setIsDeviceMaster(true);
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
     * Khách hàng hoặc Thu ngân yêu cầu thanh toán (Đóng băng hóa đơn & chờ thanh toán)
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
        List<OrderEntity> sessionOrders = orderRepository.findByTableSessionIdOrderByCreatedAtDesc(session.getId());
        boolean hasUnpaidBill = sessionOrders.stream()
                .anyMatch(o -> o.getStatus() != OrderStatus.cancelled && (o.getPaymentStatus() != PaymentStatus.paid || o.getStatus() != OrderStatus.completed));

        if (sessionOrders.isEmpty() || !hasUnpaidBill) {
            throw new BadRequestException("Bàn hiện chưa có món nào cần thanh toán!");
        }

        session.setStatus(TableSessionStatus.payment_requested);
        TableSessionEntity saved = tableSessionRepository.save(session);
        log.info("❄️ Table session {} for table {} is now PAYMENT_REQUESTED (frozen for payment)", saved.getId(), saved.getTableNo());

        // Đếm số món chưa hoàn tất phục vụ (chưa served và chưa cancelled)
        long unservedCount = sessionOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.cancelled)
                .flatMap(o -> orderItemRepository.findByOrder_Id(o.getId()).stream())
                .filter(it -> it.getStatus() != OrderItemStatus.served && it.getStatus() != OrderItemStatus.cancelled)
                .count();

        OrderEntity primaryOrder = sessionOrders.get(0);
        BigDecimal totalAmount = primaryOrder.getTotalAmount() != null ? primaryOrder.getTotalAmount() : BigDecimal.ZERO;

        // Bắn WebSocket thông báo Thu ngân: Bàn X đang yêu cầu thanh toán
        sendWebSocketEvent("TABLE_PAYMENT_REQUESTED", Map.of(
                "table_id", saved.getTableId(),
                "table_no", saved.getTableNo(),
                "session_token", saved.getSessionToken(),
                "total_amount", totalAmount,
                "unserved_items_count", unservedCount,
                "payment_code", primaryOrder.getOrderNumber()
        ));

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

        sendWebSocketEvent("TABLE_PAYMENT_REQUEST_CANCELLED", Map.of(
                "table_id", saved.getTableId(),
                "table_no", saved.getTableNo(),
                "session_token", saved.getSessionToken()
        ));

        return mapToResponse(saved);
    }

    /**
     * Nhân viên xác nhận đã nhận thanh toán (Tiền mặt / Thẻ POS / Webhook đối soát)
     */
    @Transactional
    public TableSessionResponse confirmPayment(String sessionToken, String staffId, PaymentMethod method, BigDecimal amountReceived) {
        return confirmPayment(sessionToken, staffId, method, amountReceived, false);
    }

    @Transactional
    public TableSessionResponse confirmPayment(String sessionToken, String staffId, PaymentMethod method, BigDecimal amountReceived, boolean forceConfirm) {
        TableSessionEntity session = tableSessionRepository.findBySessionTokenWithLock(sessionToken.trim())
                .orElseThrow(() -> new BadRequestException("Phiên bàn không tồn tại hoặc đã bị hủy."));

        if (session.getStatus() == TableSessionStatus.closed) {
            throw new ConflictException("Phiên bàn này đã được đóng và thanh toán trước đó.");
        }

        List<OrderEntity> sessionOrders = orderRepository.findByTableSessionIdOrderByCreatedAtDesc(session.getId());
        List<OrderEntity> openOrders = sessionOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.cancelled && o.getStatus() != OrderStatus.completed)
                .toList();

        if (openOrders.isEmpty()) {
            openOrders = sessionOrders.stream()
                    .filter(o -> o.getStatus() != OrderStatus.cancelled && o.getPaymentStatus() != PaymentStatus.paid)
                    .toList();
        }

        if (openOrders.isEmpty()) {
            throw new ConflictException("Bàn không có đơn hàng nào cần thanh toán.");
        }

        OrderEntity primaryOrder = openOrders.get(0);
        paymentService.completePayment(
                primaryOrder.getId(),
                "STAFF_POS:" + (staffId != null ? staffId : "POS"),
                "TXN-" + System.currentTimeMillis(),
                amountReceived,
                method != null ? method : PaymentMethod.cash,
                "Staff confirmed: " + (staffId != null ? staffId : "POS") + " for session " + session.getId(),
                forceConfirm
        );

        TableSessionEntity saved = tableSessionRepository.findById(session.getId()).orElse(session);
        TableSessionResponse response = mapToResponse(saved);
        response.setMessage("Thanh toán thành công! Bàn " + saved.getTableNo() + " đã chuyển sang trạng thái chờ dọn dẹp.");
        return response;
    }

    /**
     * Thu ngân xác nhận thanh toán trực tiếp qua tableId (dành cho Admin / POS)
     */
    @Transactional
    public TableSessionResponse confirmPaymentByTable(String tableId, String staffId, PaymentMethod method, BigDecimal amountReceived) {
        return confirmPaymentByTable(tableId, staffId, method, amountReceived, false);
    }

    @Transactional
    public TableSessionResponse confirmPaymentByTable(String tableId, String staffId, PaymentMethod method, BigDecimal amountReceived, boolean forceConfirm) {
        List<TableSessionStatus> activeStatuses = List.of(
                TableSessionStatus.active,
                TableSessionStatus.payment_requested,
                TableSessionStatus.payment_pending,
                TableSessionStatus.paid
        );
        List<TableSessionEntity> sessions = tableSessionRepository.findByTableIdAndStatusInWithLock(tableId, activeStatuses);
        if (!sessions.isEmpty()) {
            return confirmPayment(sessions.get(0).getSessionToken(), staffId, method, amountReceived, forceConfirm);
        }

        Optional<TableEntity> tableOpt = tableRepository.findById(tableId);
        if (tableOpt.isEmpty()) {
            throw new BadRequestException("Không tìm thấy bàn với ID: " + tableId);
        }
        TableEntity table = tableOpt.get();

        List<OrderEntity> openOrders = orderRepository.findByTableIdAndStatusNotIn(
                tableId,
                List.of(OrderStatus.completed, OrderStatus.cancelled)
        );

        if (openOrders.isEmpty() && table.getTableNo() != null) {
            openOrders = orderRepository.findByTableNoAndStatusNotIn(
                    table.getTableNo(),
                    List.of(OrderStatus.completed, OrderStatus.cancelled)
            );
        }

        String tableLabel = table.getTableNo() != null && table.getTableNo().startsWith("Bàn")
                ? table.getTableNo()
                : "Bàn " + table.getTableNo();

        if (openOrders.isEmpty()) {
            throw new ConflictException(tableLabel + " hiện không có phiên hoặc đơn hàng mở nào cần thanh toán (Hóa đơn đã được thanh toán và đóng trước đó)!");
        }

        OrderEntity primaryOrder = openOrders.get(0);
        paymentService.completePayment(
                primaryOrder.getId(),
                "STAFF_POS:" + (staffId != null ? staffId : "POS"),
                "TXN-" + System.currentTimeMillis(),
                amountReceived,
                method != null ? method : PaymentMethod.cash,
                "Staff confirmed by table " + tableId,
                forceConfirm
        );

        return TableSessionResponse.builder()
                .tableId(tableId)
                .tableNo(table.getTableNo())
                .status(TableSessionStatus.closed)
                .message("Thanh toán thành công! " + tableLabel + " đã chuyển sang trạng thái chờ dọn dẹp.")
                .build();
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
            t.setCurrentOrderId(null);
            tableRepository.save(t);
            notifyTableStatusChanged(tableId, TableStatus.available);
        });
    }

    /**
     * Nhân viên / Thu ngân reset phiên bàn (khi khách bỏ về hoặc đổi máy)
     */
    @Transactional
    public void resetSessionForTable(String tableId, String staffId) {
        resetSessionForTable(tableId, staffId, "MANUAL_RESET");
    }

    @Transactional
    public void resetSessionForTable(String tableId, String staffId, String reason) {
        String effectiveReason = (reason != null && !reason.isBlank()) ? reason.trim() : "MANUAL_RESET";
        closeSessionsForTable(tableId, "STAFF_RESET_SESSION:" + (staffId != null ? staffId : "STAFF") + ":" + effectiveReason);
        tableRepository.findById(tableId).ifPresent(t -> {
            t.setStatus(TableStatus.available);
            t.setCurrentOrderId(null);
            tableRepository.save(t);
            notifyTableStatusChanged(t.getId(), TableStatus.available);
        });
        sendWebSocketEvent("TABLE_SESSION_RESET", Map.of(
                "table_id", tableId,
                "staff_id", (staffId != null ? staffId : "STAFF"),
                "reason", effectiveReason,
                "status", "available"
        ));
        log.warn("⚠️ [AUDIT] Nhân viên [{}] đã RESET toàn bộ phiên của bàn [{}]. Lý do: {}", (staffId != null ? staffId : "STAFF"), tableId, effectiveReason);
    }

    private void notifyTableStatusChanged(String tableId, TableStatus newStatus) {
        log.debug("Table status changed: {} -> {}", tableId, newStatus);
        sendWebSocketEvent("TABLE_STATUS_CHANGED", Map.of(
                "table_id", tableId,
                "status", newStatus.name().toLowerCase()
        ));
    }

    private void sendWebSocketEvent(String eventType, Object payload) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event_type", eventType);
            event.put("eventType", eventType);
            event.put("timestamp", System.currentTimeMillis());
            if (payload instanceof Map) {
                event.putAll((Map<String, Object>) payload);
            } else {
                event.put("data", payload);
            }
            String json = objectMapper.writeValueAsString(event);
            orderWebSocketHandler.broadcast(json);
        } catch (Exception e) {
            log.warn("Không thể gửi WebSocket event {}: {}", eventType, e.getMessage());
        }
    }

    public TableSessionResponse mapToResponse(TableSessionEntity entity) {
        TableSessionResponse.TableSessionResponseBuilder builder = TableSessionResponse.builder()
                .id(entity.getId())
                .tableId(entity.getTableId())
                .tableNo(entity.getTableNo())
                .sessionToken(entity.getSessionToken())
                .deviceToken(entity.getDeviceToken())
                .isDeviceMaster(true)
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
                        List.of(OrderStatus.pending, OrderStatus.confirmed, OrderStatus.preparing, OrderStatus.ready, OrderStatus.completed)
                );

        if (activeOrderOpt.isPresent()) {
            OrderEntity order = activeOrderOpt.get();
            builder.activeOrderId(order.getId());
            builder.activeOrderNumber(order.getOrderNumber());
            builder.totalAmount(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            builder.paymentStatus(order.getPaymentStatus());

        } else {
            builder.totalAmount(BigDecimal.ZERO);
        }

        return builder.build();
    }
}

