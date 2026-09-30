package com.omniresto.backend.service;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.ReservationEntity;
import com.omniresto.backend.domain.enums.ReservationStatus;
import com.omniresto.backend.model.reservation.request.ReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.repository.BranchRepository;
import com.omniresto.backend.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BranchRepository branchRepository;

    /**
     * Get all reservations, optionally filtered by branchId, date, and/or status.
     */
    public List<ReservationResponse> getAllReservations(String branchId, LocalDate date, ReservationStatus status) {
        List<ReservationEntity> reservations;

        if (branchId != null && !branchId.equals("ALL") && date != null) {
            reservations = reservationRepository.findByBranchIdAndReservationDate(branchId, date);
        } else if (branchId != null && !branchId.equals("ALL")) {
            reservations = reservationRepository.findByBranchId(branchId);
        } else if (date != null) {
            reservations = reservationRepository.findByReservationDate(date);
        } else {
            reservations = reservationRepository.findAll();
        }

        if (status != null) {
            reservations = reservations.stream()
                    .filter(r -> r.getStatus() == status)
                    .collect(Collectors.toList());
        }

        return reservations.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a single reservation by id.
     */
    public ReservationResponse getReservationById(String id) {
        ReservationEntity entity = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + id));
        return mapToResponse(entity);
    }

    /**
     * Create a new reservation from a customer request.
     */
    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {
        // Resolve branchId: default to first available branch if not provided
        String branchId = request.getBranchId();
        if (branchId == null || branchId.isBlank()) {
            branchId = branchRepository.findAll().stream()
                    .findFirst()
                    .map(b -> b.getId())
                    .orElse("br-01");
        }

        ReservationEntity entity = ReservationEntity.builder()
                .branchId(branchId)
                .customerName(request.getCustomerName().trim())
                .customerPhone(request.getCustomerPhone().replaceAll("\\s+", ""))
                .customerEmail(request.getCustomerEmail())
                .partySize(request.getPartySize() != null ? request.getPartySize() : 2)
                .reservationDate(request.getReservationDate())
                .reservationTime(request.getReservationTime())
                .tableNo(request.getTableNo())
                .notes(request.getNotes())
                .status(ReservationStatus.pending)
                .build();

        ReservationEntity saved = reservationRepository.save(entity);
        return mapToResponse(saved);
    }

    /**
     * Update reservation status (admin action: confirm, seat, complete, cancel, no_show).
     */
    @Transactional
    public ReservationResponse updateReservationStatus(String id, ReservationStatus status) {
        ReservationEntity entity = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + id));
        entity.setStatus(status);
        ReservationEntity updated = reservationRepository.save(entity);
        return mapToResponse(updated);
    }

    /**
     * Assign a table to a reservation (admin action).
     */
    @Transactional
    public ReservationResponse assignTable(String id, String tableNo) {
        ReservationEntity entity = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + id));
        entity.setTableNo(tableNo);
        ReservationEntity updated = reservationRepository.save(entity);
        return mapToResponse(updated);
    }

    /**
     * Delete a reservation by id.
     */
    @Transactional
    public void deleteReservation(String id) {
        if (!reservationRepository.existsById(id)) {
            throw new RuntimeException("Reservation not found: " + id);
        }
        reservationRepository.deleteById(id);
    }

    // ─── Mapper ──────────────────────────────────────────────────────────────

    private ReservationResponse mapToResponse(ReservationEntity entity) {
        ReservationResponse res = new ReservationResponse();
        res.setId(entity.getId());
        res.setBranchId(entity.getBranchId());
        res.setBranchName(resolveBranchName(entity.getBranchId()));
        res.setCustomerName(entity.getCustomerName());
        res.setCustomerPhone(entity.getCustomerPhone());
        res.setCustomerEmail(entity.getCustomerEmail());
        res.setPartySize(entity.getPartySize());
        res.setReservationDate(entity.getReservationDate());
        res.setReservationTime(entity.getReservationTime());
        res.setTableNo(entity.getTableNo());
        res.setNotes(entity.getNotes());
        res.setStatus(entity.getStatus());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }

    /**
     * Resolves branch name from BranchRepository; falls back to "OmniResto" if not found.
     */
    private String resolveBranchName(String branchId) {
        if (branchId == null) return "OmniResto";
        return branchRepository.findById(branchId)
                .map(BranchEntity::getName)
                .orElse("OmniResto");
    }
}
