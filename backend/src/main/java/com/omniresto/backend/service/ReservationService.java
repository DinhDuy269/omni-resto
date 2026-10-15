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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
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

    // ================= HELPER METHODS =================

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

    @Transactional
    public ReservationResponse createOnlineReservation(OnlineReservationRequest request) {
        TableEntity assignedTable = null;
        String initialStatus = "PENDING";

        // Khách tự chọn bàn trên sơ đồ web (VD: Bàn T-07)
        if (request.getTableId() != null && !request.getTableId().isBlank()) {
            TableEntity table = tableRepository.findById(request.getTableId())
                    .orElseThrow(() -> new RuntimeException("Bàn bạn chọn không tồn tại!"));

            // Kiểm tra bàn có đang trống không
            if (table.getStatus() != TableStatus.available && table.getStatus() != TableStatus.AVAILABLE) {
                throw new RuntimeException("Bàn " + table.getTableNo() + " vừa có người khác đặt hoặc đang có khách, vui lòng chọn bàn khác!");
            }

            // 1. Khóa bàn sang RESERVED ngay lập tức
            table.setStatus(TableStatus.RESERVED);
            tableRepository.save(table);

            // 2. Gán bàn và tự động chuyển đơn thành CONFIRMED (Đã xếp bàn)
            assignedTable = table;
            initialStatus = "CONFIRMED";
        }

        ReservationEntity entity = ReservationEntity.builder()
                .reservationCode(generateReservationCode("RSV-ONL"))
                .customerName(request.getCustomerName().trim())
                .customerPhone(request.getCustomerPhone().trim())
                .customerEmail(request.getCustomerEmail() != null ? request.getCustomerEmail().trim() : null)
                .partySize(request.getPartySize())
                .reservationTime(request.getReservationTime())
                .status(initialStatus)
                .table(assignedTable)
                .specialNotes(request.getSpecialNotes())
                .build();

        ReservationEntity saved = reservationRepository.save(entity);
        ReservationResponse response = toResponse(saved);
        sseService.broadcastNewReservation(response);
        return response;
    }
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
            if (selectedTables.size() != targetTableIds.size()) {
                throw new RuntimeException("Một số bàn được chọn để ghép không tồn tại!");
            }

            for (TableEntity t : selectedTables) {
                if (t.getStatus() != TableStatus.available && t.getStatus() != TableStatus.AVAILABLE) {
                    throw new RuntimeException("Bàn " + t.getTableNo() + " hiện không trống để xếp/ghép!");
                }
            }

            primaryTable = selectedTables.get(0);

            if (selectedTables.size() > 1) {
                String mergedTag = "[MERGED:" + String.join(",", targetTableIds) + "]";
                notes = (mergedTag + " " + notes).trim();
            }

            TableStatus newTableStatus = request.isSeatedImmediately() ? TableStatus.OCCUPIED : TableStatus.RESERVED;
            updateTablesStatus(targetTableIds, newTableStatus);
        }

        String initialStatus = request.isSeatedImmediately() ? "SEATED" : (!targetTableIds.isEmpty() ? "CONFIRMED" : "PENDING");

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

    @Transactional
    public ReservationResponse assignTable(String reservationId, AssignTableRequest request) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> newTableIds = request.getTableIds();
        if (newTableIds == null || newTableIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất một bàn!");
        }

        List<TableEntity> selectedTables = tableRepository.findAllById(newTableIds);
        if (selectedTables.size() != newTableIds.size()) {
            throw new RuntimeException("Một số bàn được chọn không tồn tại trong hệ thống!");
        }

        List<String> currentHoldingTables = extractAllTableIds(res);
        for (TableEntity t : selectedTables) {
            if (t.getStatus() != TableStatus.AVAILABLE && t.getStatus() != TableStatus.available) {
                if (!currentHoldingTables.contains(t.getId())) {
                    throw new RuntimeException("Bàn " + t.getTableNo() + " hiện không sẵn sàng!");
                }
            }
        }

        currentHoldingTables.removeAll(newTableIds);
        updateTablesStatus(currentHoldingTables, TableStatus.AVAILABLE);

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

        updateTablesStatus(newTableIds, TableStatus.RESERVED);

        res.setStatus("CONFIRMED");
        reservationRepository.save(res);

        ReservationResponse response = toResponse(res);
        sseService.broadcastReservationUpdated(response);
        return response;
    }

    @Transactional
    public ReservationResponse checkIn(String reservationId) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> tableIds = extractAllTableIds(res);
        if (tableIds.isEmpty()) {
            throw new RuntimeException("Đơn đặt bàn chưa được xếp bàn, vui lòng gán bàn trước khi Check-in!");
        }

        updateTablesStatus(tableIds, TableStatus.OCCUPIED);
        res.setStatus("SEATED");
        reservationRepository.save(res);

        ReservationResponse response = toResponse(res);
        sseService.broadcastReservationUpdated(response);
        return response;
    }

    @Transactional
    public ReservationResponse cancelReservation(String reservationId, String reason) {
        ReservationEntity res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt bàn!"));

        List<String> tableIds = extractAllTableIds(res);
        updateTablesStatus(tableIds, TableStatus.AVAILABLE);

        res.setStatus("CANCELLED");
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
            updateTablesStatus(tableIds, TableStatus.AVAILABLE);

            res.setStatus("CANCELLED");
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

    /**
     * Chuyển đổi Entity sang Response an toàn tuyệt đối, không unbox null
     */
    public ReservationResponse toResponse(ReservationEntity entity) {
        List<String> tableIds = extractAllTableIds(entity);
        String displayTableNo = null;
        Integer totalCapacity = null; // Dùng Integer Object, KHÔNG dùng primitive int

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
                .tableNo(displayTableNo)
                .tableCapacity(totalCapacity)
                .specialNotes(entity.getSpecialNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}