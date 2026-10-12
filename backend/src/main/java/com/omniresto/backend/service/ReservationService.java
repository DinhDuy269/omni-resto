package com.omniresto.backend.service;

import com.omniresto.backend.domain.ReservationEntity;
import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.OperatingShift;
import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.model.reservation.request.AssignTableRequest;
import com.omniresto.backend.model.reservation.request.OfflineReservationRequest;
import com.omniresto.backend.model.reservation.request.OnlineReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.repository.ReservationRepository;
import com.omniresto.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationSseService sseService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final Map<String, Object> PHONE_LOCKS = new ConcurrentHashMap<>();

    // 1. Khách đặt bàn trực tuyến
    @Transactional
    public ReservationResponse createOnlineReservation(OnlineReservationRequest request) {
        String cleanPhone = normalizePhoneNumber(request.getCustomerPhone());
        Object lock = PHONE_LOCKS.computeIfAbsent(cleanPhone, k -> new Object());

        synchronized (lock) {
            try {
                // [Kiểm tra 1] Khung giờ nhà hàng hoạt động
                validateOperatingHours(request.getReservationTime());

                // [Kiểm tra 2] Chặn spam số điện thoại đang có đơn hiệu lực
                checkDuplicateActiveReservation(cleanPhone);

                String code = generateReservationCode("ONL");

                ReservationEntity reservation = ReservationEntity.builder()
                        .reservationCode(code)
                        .customerName(request.getCustomerName().trim())
                        .customerPhone(cleanPhone)
                        .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                        .partySize(request.getPartySize())
                        .reservationTime(request.getReservationTime())
                        .status("PENDING")
                        .specialNotes(request.getSpecialNotes())
                        .build();

                ReservationResponse response = mapToResponse(reservationRepository.save(reservation));
                sseService.broadcastNewReservation(response);

                return response;
            } finally {
                PHONE_LOCKS.remove(cleanPhone);
            }
        }
    }

    // 2. Nhân viên tạo đặt bàn Offline
    @Transactional
    public ReservationResponse createOfflineReservation(OfflineReservationRequest request) {
        String cleanPhone = normalizePhoneNumber(request.getCustomerPhone());

        // Nếu không phải khách vào ăn ngay, kiểm tra giờ hoạt động và chống trùng số điện thoại
        if (!request.isSeatedImmediately()) {
            validateOperatingHours(request.getReservationTime());
            checkDuplicateActiveReservation(cleanPhone);
        }

        String code = generateReservationCode("OFF");
        TableEntity table = null;
        String status = "PENDING";

        if (request.getTableId() != null && !request.getTableId().isBlank()) {
            table = validateAndGetAvailableTable(request.getTableId(), request.getPartySize(), request.getReservationTime(), null);
            status = request.isSeatedImmediately() ? "SEATED" : "CONFIRMED";

            if (request.isSeatedImmediately()) {
                table.setStatus(TableStatus.occupied);
                tableRepository.save(table);
            }
        }

        ReservationEntity reservation = ReservationEntity.builder()
                .reservationCode(code)
                .customerName(request.getCustomerName().trim())
                .customerPhone(cleanPhone)
                .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status(status)
                .table(table)
                .specialNotes(request.getSpecialNotes())
                .build();

        ReservationResponse response = mapToResponse(reservationRepository.save(reservation));
        sseService.broadcastNewReservation(response);

        return response;
    }

    // Kiểm tra giờ đặt bàn có thuộc khung giờ mở cửa hay không
    private void validateOperatingHours(LocalDateTime reservationDateTime) {
        LocalTime time = reservationDateTime.toLocalTime();
        OperatingShift shift = OperatingShift.fromTime(time);

        if (shift == OperatingShift.BREAK) {
            throw new RuntimeException("Thời gian bạn chọn (" + time + ") nằm trong Giờ Nghỉ Bếp (14:30 - 16:30). " +
                    "Nhà hàng đang đóng cửa nghỉ ngơi, bạn hãy đặt vào giờ khác!");
        }

        if (shift == OperatingShift.CLOSED) {
            throw new RuntimeException("Thời gian bạn chọn (" + time + ") nhà hàng đang đóng cửa (22:00 - 06:00). " +
                    "Bạn hãy đặt vào giờ khác (06:00 - 14:30 hoặc 16:30 - 22:00)!");
        }
    }

    private void checkDuplicateActiveReservation(String phone) {
        List<ReservationEntity> activeReservations = reservationRepository.findActiveReservationsByPhone(phone);
        if (!activeReservations.isEmpty()) {
            ReservationEntity existing = activeReservations.get(0);
            String formattedTime = existing.getReservationTime().format(TIME_FORMATTER);
            throw new RuntimeException("Số điện thoại " + phone + " hiện đang có đơn đặt bàn ("
                    + existing.getReservationCode() + ") vào lúc " + formattedTime
                    + " chưa hoàn thành. Quý khách vui lòng không đặt nhiều bàn cùng lúc!");
        }
    }

    private String normalizePhoneNumber(String phone) {
        if (phone == null) return "";
        return phone.trim().replaceAll("[\\s.-]+", "");
    }

    @Transactional
    public ReservationResponse assignTable(String reservationId, AssignTableRequest request) {
        ReservationEntity reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đặt bàn: " + reservationId));

        if ("CANCELLED".equals(reservation.getStatus()) || "COMPLETED".equals(reservation.getStatus())) {
            throw new RuntimeException("Đơn đặt bàn đã kết thúc hoặc bị hủy, không thể xếp bàn!");
        }

        TableEntity table = validateAndGetAvailableTable(
                request.getTableId(),
                reservation.getPartySize(),
                reservation.getReservationTime(),
                reservation.getId()
        );

        reservation.setTable(table);
        reservation.setStatus("CONFIRMED");

        ReservationResponse response = mapToResponse(reservationRepository.save(reservation));
        sseService.broadcastReservationUpdated(response);

        return response;
    }

    @Transactional
    public ReservationResponse checkIn(String reservationId) {
        ReservationEntity reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        if (reservation.getTable() == null) {
            throw new RuntimeException("Đơn đặt bàn chưa được xếp bàn, vui lòng gán bàn trước khi nhận khách!");
        }

        reservation.setStatus("SEATED");
        TableEntity table = reservation.getTable();
        table.setStatus(TableStatus.occupied);
        tableRepository.save(table);

        ReservationResponse response = mapToResponse(reservationRepository.save(reservation));
        sseService.broadcastReservationUpdated(response);

        return response;
    }

    @Transactional
    public ReservationResponse cancelReservation(String reservationId, String reason) {
        ReservationEntity reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        reservation.setStatus("CANCELLED");
        if (reason != null && !reason.isBlank()) {
            String currentNotes = reservation.getSpecialNotes() != null ? reservation.getSpecialNotes() + " | " : "";
            reservation.setSpecialNotes(currentNotes + "Lý do hủy: " + reason);
        }

        ReservationResponse response = mapToResponse(reservationRepository.save(reservation));
        sseService.broadcastReservationUpdated(response);

        return response;
    }

    // 👉 Lấy danh sách đặt bàn: Luôn đưa đơn mới tạo nhất lên đầu tiên (CreatedAt DESC)
    @Transactional
    public List<ReservationResponse> getAll(String status) {
        autoCancelExpiredReservations();

        List<ReservationEntity> list = (status != null && !status.isBlank())
                ? reservationRepository.findByStatusOrderByCreatedAtDesc(status)
                : reservationRepository.findAllByOrderByCreatedAtDesc();
        return list.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse getByCode(String code) {
        return reservationRepository.findByReservationCode(code)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã đặt bàn: " + code));
    }

    private TableEntity validateAndGetAvailableTable(String tableId, int partySize, LocalDateTime reservationTime, String excludeResId) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Bàn không tồn tại!"));

        if (table.getCapacity() < partySize) {
            throw new RuntimeException("Bàn số " + table.getTableNo() + " chỉ chứa tối đa "
                    + table.getCapacity() + " người (Yêu cầu: " + partySize + " người)!");
        }

        LocalDateTime conflictStart = reservationTime.minusHours(2);
        LocalDateTime conflictEnd = reservationTime.plusHours(2);

        List<ReservationEntity> conflicts = reservationRepository.findConflictingReservations(
                tableId, conflictStart, conflictEnd, excludeResId
        );

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("Bàn " + table.getTableNo() + " đã có khách đặt lúc "
                    + conflicts.get(0).getReservationTime() + "!");
        }

        return table;
    }

    private String generateReservationCode(String prefix) {
        int randomNum = 1000 + new Random().nextInt(9000);
        return "RSV-" + prefix + "-" + randomNum;
    }

    private ReservationResponse mapToResponse(ReservationEntity entity) {
        return ReservationResponse.builder()
                .id(entity.getId())
                .reservationCode(entity.getReservationCode())
                .customerName(entity.getCustomerName())
                .customerPhone(entity.getCustomerPhone())
                .customerEmail(entity.getCustomerEmail())
                .partySize(entity.getPartySize())
                .reservationTime(entity.getReservationTime())
                .status(entity.getStatus())
                .tableId(entity.getTable() != null ? entity.getTable().getId() : null)
                .tableNo(entity.getTable() != null ? entity.getTable().getTableNo() : null)
                .tableCapacity(entity.getTable() != null ? entity.getTable().getCapacity() : null)
                .specialNotes(entity.getSpecialNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TableEntity> getAllTables() {
        return tableRepository.findAll();
    }

    @Transactional
    public int autoCancelExpiredReservations() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);

        List<ReservationEntity> expiredList = reservationRepository.findExpiredReservations(threshold);
        if (expiredList.isEmpty()) {
            return 0;
        }

        for (ReservationEntity reservation : expiredList) {
            reservation.setStatus("CANCELLED");
            String currentNotes = reservation.getSpecialNotes() != null ? reservation.getSpecialNotes() + " | " : "";
            reservation.setSpecialNotes(currentNotes + "Hệ thống tự động hủy: Quá 30 phút so với giờ hẹn khách chưa tới nhận bàn.");
        }

        reservationRepository.saveAll(expiredList);
        return expiredList.size();
    }
}