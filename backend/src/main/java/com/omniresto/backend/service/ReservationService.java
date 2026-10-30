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
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final ReservationSseService sseService;

    private static final Pattern MERGED_PATTERN = Pattern.compile("\\[MERGED:([^\\]]+)\\]");
    private static final SecureRandom RANDOM = new SecureRandom();

    private List<String> extractAllTableIds(ReservationEntity res) {
        Set<String> ids = new LinkedHashSet<>();
        if (res.getTable() != null) {
            ids.add(res.getTable().getId());
        }
        if (res.getSpecialNotes() != null) {
            Matcher matcher = MERGED_PATTERN.matcher(res.getSpecialNotes());
            if (matcher.find()) {
                String[] split = matcher.group(1).split(",");
                for (String s : split) {
                    if (!s.trim().isEmpty()) {
                        ids.add(s.trim());
                    }
                }
            }
        }
        return new ArrayList<>(ids);
    }

    private void updateTablesStatus(List<String> tableIds, TableStatus status) {
        if (tableIds == null || tableIds.isEmpty()) return;
        List<TableEntity> tables = tableRepository.findAllById(tableIds);
        for (TableEntity t : tables) {
            t.setStatus(status);
        }
        tableRepository.saveAll(tables);
    }

    private String generateReservationCode(String prefix) {
        int randomNum = 1000 + RANDOM.nextInt(9000);
        return prefix + "-" + randomNum;
    }

    // ================= BUSINESS METHODS =================

    /**
     * 1. Khách đặt bàn trực tuyến:
     * - Tự động kiểm tra chống spam theo số điện thoại (chặn nếu còn đơn PENDING hoặc CONFIRMED)
     * - Kiểm tra tính hợp lệ của thời gian đặt bàn
     * - Gán bàn khách chọn vào đơn nhưng KHÔNG KHÓA BÀN trong database (vẫn là AVAILABLE)
     * - Phát sự kiện Realtime SSE thông báo tới màn hình Admin
     */
    @Transactional
    public ReservationResponse createOnlineReservation(OnlineReservationRequest request) {
        String phone = request.getCustomerPhone() != null ? request.getCustomerPhone().trim() : "";

        // 1. Chống Spam: Kiểm tra số điện thoại có đơn đặt bàn đang chờ phục vụ hay không
        if (!phone.isBlank()) {
            List<ReservationEntity> activeReservations = reservationRepository.findActiveReservationsByPhone(phone);
            if (!activeReservations.isEmpty()) {
                ReservationEntity active = activeReservations.get(0);
                throw new RuntimeException("Số điện thoại " + phone + " hiện đang có đơn đặt bàn ("
                        + active.getReservationCode()
                        + ") chưa hoàn tất. Vui lòng không đặt trùng lặp!");
            }
        }

        // 2. Kiểm tra thời gian đặt bàn không được ở trong quá khứ
        if (request.getReservationTime() != null && request.getReservationTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Thời gian đặt bàn không hợp lệ (không thể chọn thời gian trong quá khứ)!");
        }

        // 3. Xử lý gán bàn (nếu khách có chọn bàn cụ thể)
        TableEntity assignedTable = null;
        String initialStatus = "pending";

        if (request.getTableId() != null && !request.getTableId().isBlank()) {
            assignedTable = tableRepository.findById(request.getTableId().trim())
                    .orElseThrow(() -> new RuntimeException("Bàn bạn chọn không tồn tại!"));

            // Đơn có bàn chọn trước chuyển sang CONFIRMED để Admin có sẵn nút "Nhận Bàn"
            initialStatus = "confirmed";

            // LƯU Ý: KHÔNG gọi table.setStatus(...) và KHÔNG save table tại đây!
        }

        // 4. Tạo entity và lưu vào cơ sở dữ liệu
        ReservationEntity entity = ReservationEntity.builder()
                .reservationCode(generateReservationCode("RSV-ONL"))
                .customerName(request.getCustomerName().trim())
                .customerPhone(phone)
                .customerEmail(request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()
                        ? request.getCustomerEmail().trim()
                        : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status(initialStatus)
                .table(assignedTable)
                .specialNotes(request.getSpecialNotes() != null ? request.getSpecialNotes().trim() : null)
                .build();

        ReservationEntity saved = reservationRepository.save(entity);
        ReservationResponse response = toResponse(saved);

        // 5. Phát sóng Realtime SSE và đọc loa thông báo tới Admin
        sseService.broadcastNewReservation(response);

        return response;
    }

    /**
     * 2. Đặt bàn Hotline / Offline:
     * Chỉ khóa bàn khi khách đang có mặt ăn ngay (seatedImmediately = true).
     */
    @Transactional
    public ReservationResponse createOfflineReservation(OfflineReservationRequest request) {
        List<String> targetTableIds = new ArrayList<>();
        if (request.getTableIds() != null && !request.getTableIds().isEmpty()) {
            targetTableIds.addAll(request.getTableIds());
        } else if (request.getTableId() != null && !request.getTableId().isBlank()) {
            targetTableIds.add(request.getTableId().trim());
        }

        TableEntity primaryTable = null;
        String notes = request.getSpecialNotes() != null ? request.getSpecialNotes() : "";

        if (!targetTableIds.isEmpty()) {
            List<TableEntity> selectedTables = tableRepository.findAllById(targetTableIds);
            primaryTable = selectedTables.get(0);

            if (selectedTables.size() > 1) {
                String mergedTag = "[MERGED:" + String.join(",", targetTableIds) + "]";
                notes = (mergedTag + " " + notes).trim();
            }

            // CHỈ KHÓA BÀN NẾU KHÁCH ĂN NGAY TẠI CHỖ
            if (request.isSeatedImmediately()) {
                updateTablesStatus(targetTableIds, TableStatus.occupied);
            }
        }

        String initialStatus = request.isSeatedImmediately() ? "seated" : (!targetTableIds.isEmpty() ? "confirmed" : "pending");

        ReservationEntity entity = ReservationEntity.builder()
                .reservationCode(generateReservationCode("RSV-OFF"))
                .customerName(request.getCustomerName().trim())
                .customerPhone(request.getCustomerPhone().trim())
                .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status(initialStatus)
                .table(primaryTable)
                .specialNotes(notes)
                .build();

        ReservationEntity saved = reservationRepository.save(entity);
        ReservationResponse response = toResponse(saved);
        sseService.broadcastNewReservation(response);
        return response;
    }

    public List<ReservationResponse> getAll(String status) {
        List<ReservationEntity> list;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = reservationRepository.findAll().stream()
                    .filter(r -> status.equalsIgnoreCase(r.getStatus()))
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .toList();
        } else {
            list = reservationRepository.findAll().stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .toList();
        }
        return list.stream().map(this::toResponse).toList();
    }

    public ReservationResponse getByCode(String code) {
        ReservationEntity entity = reservationRepository.findAll().stream()
                .filter(r -> r.getReservationCode().equalsIgnoreCase(code.trim()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn với mã: " + code));
        return toResponse(entity);
    }

    /**
     * Phương thức phân trang và lọc ca vận hành mới cho Admin:
     * Hỗ trợ tìm kiếm theo tên/sđt/mã, lọc theo trạng thái, ngày hẹn và ca làm việc.
     */
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getReservationsPaged(
            String status,
            String search,
            LocalDate date,
            OperatingShift shift,
            Pageable pageable
    ) {
        String cleanStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toLowerCase()
                : null;

        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        LocalDateTime startDate = (date != null) ? date.atStartOfDay() : null;
        LocalDateTime endDate = (date != null) ? date.atTime(LocalTime.MAX) : null;

        boolean isShiftFilter = (shift != null);
        boolean isOvernight = false;
        Integer startMinute = null;
        Integer endMinute = null;

        if (isShiftFilter) {
            startMinute = shift.getStartTime().getHour() * 60 + shift.getStartTime().getMinute();
            endMinute = shift.getEndTime().getHour() * 60 + shift.getEndTime().getMinute();
            isOvernight = startMinute > endMinute; // Đối với ca CLOSED: 22:00 -> 06:00
        }

        Page<ReservationEntity> entityPage = reservationRepository.findReservationsPaged(
                cleanStatus,
                cleanSearch,
                startDate,
                endDate,
                isShiftFilter,
                isOvernight,
                startMinute,
                endMinute,
                pageable
        );

        return entityPage.map(this::toResponse);
    }

    /**
     * 3. Admin xếp / ghép bàn: Chỉ lưu bàn vào đơn, KHÔNG KHÓA BÀN trước giờ hẹn.
     */
    @Transactional
    public ReservationResponse assignTable(String reservationId, AssignTableRequest request) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> newTableIds = request.getTableIds();
        if (newTableIds == null || newTableIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất một bàn!");
        }

        List<TableEntity> selectedTables = tableRepository.findAllById(newTableIds);
        TableEntity primaryTable = selectedTables.get(0);
        res.setTable(primaryTable);

        String currentNotes = res.getSpecialNotes() != null ? res.getSpecialNotes() : "";
        currentNotes = currentNotes.replaceAll("\\[MERGED:[^\\]]+\\]", "").trim();

        if (selectedTables.size() > 1) {
            String mergedTag = "[MERGED:" + String.join(",", newTableIds) + "]";
            res.setSpecialNotes((mergedTag + " " + currentNotes).trim());
        } else {
            res.setSpecialNotes(currentNotes);
        }

        res.setStatus("confirmed");
        reservationRepository.save(res);

        ReservationResponse response = toResponse(res);
        sseService.broadcastReservationUpdated(response);
        return response;
    }

    /**
     * 4. ĐÂY LÀ NƠI DUY NHẤT KHÓA BÀN:
     * Khi Admin bấm "Nhận Bàn" -> Khách đã tới quán ăn thực tế -> Chuyển bàn sang OCCUPIED!
     */
    @Transactional
    public ReservationResponse checkIn(String reservationId) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> tableIds = extractAllTableIds(res);
        if (tableIds.isEmpty()) {
            throw new RuntimeException("Đơn đặt bàn chưa được gán bàn, vui lòng xếp bàn trước khi Check-in!");
        }

        // LÚC NÀY MỚI CHÍNH THỨC KHÓA BÀN SANG OCCUPIED TRONG DATABASE
        updateTablesStatus(tableIds, TableStatus.occupied);
        res.setStatus("seated");
        reservationRepository.save(res);

        ReservationResponse response = toResponse(res);
        sseService.broadcastReservationUpdated(response);
        return response;
    }

    /**
     * 5. Khi Hủy đơn -> Trả bàn về AVAILABLE
     */
    @Transactional
    public ReservationResponse cancelReservation(String reservationId, String reason) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> tableIds = extractAllTableIds(res);
        updateTablesStatus(tableIds, TableStatus.available);

        res.setStatus("cancelled");
        if (reason != null && !reason.isBlank()) {
            String existingNotes = res.getSpecialNotes() != null ? res.getSpecialNotes() : "";
            res.setSpecialNotes(existingNotes + " | Lý do hủy: " + reason);
        }
        reservationRepository.save(res);

        ReservationResponse response = toResponse(res);
        sseService.broadcastReservationUpdated(response);
        return response;
    }

    @Transactional
    public int autoCancelExpiredReservations() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
        List<ReservationEntity> expiredList = reservationRepository.findAll().stream()
                .filter(r -> "CONFIRMED".equalsIgnoreCase(r.getStatus()) || "PENDING".equalsIgnoreCase(r.getStatus()))
                .filter(r -> r.getReservationTime().isBefore(threshold))
                .toList();

        for (ReservationEntity res : expiredList) {
            List<String> tableIds = extractAllTableIds(res);
            updateTablesStatus(tableIds, TableStatus.available);

            res.setStatus("cancelled");
            String existingNotes = res.getSpecialNotes() != null ? res.getSpecialNotes() : "";
            res.setSpecialNotes(existingNotes + " | Hệ thống tự động hủy: Quá 30 phút so với giờ hẹn khách chưa tới nhận bàn.");
            reservationRepository.save(res);

            sseService.broadcastReservationUpdated(toResponse(res));
        }
        return expiredList.size();
    }

    public List<TableEntity> getAllTables() {
        return tableRepository.findAll();
    }

    public ReservationResponse toResponse(ReservationEntity entity) {
        List<String> tableIds = extractAllTableIds(entity);
        String displayTableNo = null;
        Integer totalCapacity = null;

        if (!tableIds.isEmpty()) {
            List<TableEntity> tables = tableRepository.findAllById(tableIds);
            List<String> names = new ArrayList<>();
            int sum = 0;
            for (TableEntity t : tables) {
                if (t.getTableNo() != null) {
                    names.add(t.getTableNo());
                }
                if (t.getCapacity() != null) {
                    sum += t.getCapacity();
                }
            }
            if (!names.isEmpty()) {
                displayTableNo = String.join(" + ", names);
            }
            if (sum > 0) {
                totalCapacity = sum;
            }
        } else if (entity.getTable() != null) {
            displayTableNo = entity.getTable().getTableNo();
            totalCapacity = entity.getTable().getCapacity();
        }

        // Tự động gán thông tin Ca làm việc từ thời gian đặt bàn
        OperatingShift shift = null;
        String shiftName = null;
        if (entity.getReservationTime() != null) {
            shift = OperatingShift.fromTime(entity.getReservationTime().toLocalTime());
            shiftName = shift.getName() + " (" + shift.getTimeRange() + ")";
        }

        return ReservationResponse.builder()
                .id(entity.getId())
                .reservationCode(entity.getReservationCode())
                .customerName(entity.getCustomerName())
                .customerPhone(entity.getCustomerPhone())
                .customerEmail(entity.getCustomerEmail())
                .partySize(entity.getPartySize())
                .reservationTime(entity.getReservationTime())
                .status(entity.getStatus() != null ? entity.getStatus().toLowerCase() : "pending")
                .tableId(entity.getTable() != null ? entity.getTable().getId() : null)
                .tableNo(displayTableNo)
                .tableCapacity(totalCapacity)
                .specialNotes(entity.getSpecialNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .shift(shift)
                .shiftName(shiftName)
                .build();
    }
    // Kiểm tra số điện thoại có đang dính đơn đặt bàn active nào không
    public boolean hasActiveBookingByPhone(String phone) {
        if (phone == null || phone.isBlank()) return false;
        return !reservationRepository.findActiveReservationsByPhone(phone.trim()).isEmpty();
    }
}