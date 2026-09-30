package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.ReservationStatus;
import com.omniresto.backend.model.reservation.request.ReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    /** GET /api/reservations?branchId=br-01&date=2025-12-31&status=pending */
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getAllReservations(
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) ReservationStatus status
    ) {
        return ResponseEntity.ok(reservationService.getAllReservations(branchId, date, status));
    }

    /** GET /api/reservations/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(@PathVariable String id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    /** POST /api/reservations — public endpoint for customers */
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(@Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.createReservation(request));
    }

    /** PATCH /api/reservations/{id}/status?status=confirmed */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable String id,
            @RequestParam ReservationStatus status
    ) {
        return ResponseEntity.ok(reservationService.updateReservationStatus(id, status));
    }

    /** PATCH /api/reservations/{id}/table?tableNo=Bàn+05 */
    @PatchMapping("/{id}/table")
    public ResponseEntity<ReservationResponse> assignTable(
            @PathVariable String id,
            @RequestParam String tableNo
    ) {
        return ResponseEntity.ok(reservationService.assignTable(id, tableNo));
    }

    /** DELETE /api/reservations/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReservation(@PathVariable String id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }
}
