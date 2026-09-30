package com.omniresto.backend.service;

import com.omniresto.backend.domain.ReservationEntity;
import com.omniresto.backend.domain.enums.ReservationStatus;
import com.omniresto.backend.model.reservation.request.ReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
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

    /**
     * Get all reservations, optionally filtered by date and/or status.
     */
    public List<ReservationResponse> getAllReservations(String branchId, LocalDate date, ReservationStatus status) {
        return getAllReservations(date, status);
    }

    public List<ReservationResponse> getAllReservations(LocalDate date, ReservationStatus status) {
        List<ReservationEntity> reservations;

        if (date != null && status != null) {
            reservations = reservationRepository.findByReservationDateAndStatus(date, status);
        } else if (date != null) {
            reservations = reservationRepository.findByReservationDate(date);
        } else if (status != null) {
            reservations = reservationRepository.findByStatus(status);
        } else {
            reservations = reservationRepository.findAll();
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
        ReservationEntity entity = ReservationEntity.builder()
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
}
