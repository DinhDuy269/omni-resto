package com.omniresto.backend.service;

import com.omniresto.backend.domain.ReservationEntity;
import com.omniresto.backend.domain.TableEntity;
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
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;

    // 1. Khách đặt bàn trực tuyến (Lưu PENDING, chưa xếp bàn)
    @Transactional
    public ReservationResponse createOnlineReservation(OnlineReservationRequest request) {
        String code = generateReservationCode("ONL");

        ReservationEntity reservation = ReservationEntity.builder()
                .reservationCode(code)
                .customerName(request.getCustomerName().trim())
                .customerPhone(request.getCustomerPhone().trim())
                .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status("PENDING")
                .specialNotes(request.getSpecialNotes())
                .build();

        return mapToResponse(reservationRepository.save(reservation));
    }

    // 2. Nhân viên tạo đặt bàn Offline (Khách gọi điện hoặc khách vãng lai tới quán)
    @Transactional
    public ReservationResponse createOfflineReservation(OfflineReservationRequest request) {
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
                .customerPhone(request.getCustomerPhone().trim())
                .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status(status)
                .table(table)
                .specialNotes(request.getSpecialNotes())
                .build();

        return mapToResponse(reservationRepository.save(reservation));
    }

    // 3. Nhân viên xếp bàn cho đơn PENDING (Chuyển thành CONFIRMED)
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

        return mapToResponse(reservationRepository.save(reservation));
    }

    // 4. Khách đến quán nhận bàn (Check-in -> SEATED)
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

        return mapToResponse(reservationRepository.save(reservation));
    }

    // 5. Hủy đơn đặt bàn
    @Transactional
    public ReservationResponse cancelReservation(String reservationId, String reason) {
        ReservationEntity reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        reservation.setStatus("CANCELLED");
        if (reason != null && !reason.isBlank()) {
            String currentNotes = reservation.getSpecialNotes() != null ? reservation.getSpecialNotes() + " | " : "";
            reservation.setSpecialNotes(currentNotes + "Lý do hủy: " + reason);
        }

        return mapToResponse(reservationRepository.save(reservation));
    }


// 6. Lấy danh sách đặt bàn (tự động quét hủy đơn trễ trước khi trả về danh sách)
    @Transactional
    public List<ReservationResponse> getAll(String status) {
        // Tự động quét và hủy đơn quá 30 phút ngay khi load dữ liệu
        autoCancelExpiredReservations();

        List<ReservationEntity> list = (status != null && !status.isBlank())
                ? reservationRepository.findByStatusOrderByReservationTimeAsc(status)
                : reservationRepository.findAll();
        return list.stream().map(this::mapToResponse).toList();
    }

    // 7. Tra cứu thông tin đặt bàn theo mã code
    @Transactional(readOnly = true)
    public ReservationResponse getByCode(String code) {
        return reservationRepository.findByReservationCode(code)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã đặt bàn: " + code));
    }

    // Helper: Kiểm tra bàn có đủ chỗ và có bị trùng cữ ăn trong vòng 2 tiếng không
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

    // Lấy toàn bộ danh sách bàn phục vụ đặt bàn và xếp chỗ
    @Transactional(readOnly = true)
    public List<TableEntity> getAllTables() {
        return tableRepository.findAll();
    }

    // Tự động hủy các đơn trễ hẹn quá 30 phút
    @Transactional
    public int autoCancelExpiredReservations() {
        // Mốc thời gian: Thời điểm hiện tại trừ đi 30 phút
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