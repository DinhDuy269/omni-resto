package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.ReservationStatus;
import com.omniresto.backend.model.reservation.request.ReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    /** GET /api/reservations?date=2026-12-31&status=pending */
    @GetMapping
    public List<ReservationResponse> getAllReservations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) ReservationStatus status,
            @RequestParam(required = false) String branchId
    ) {
        return reservationService.getAllReservations(date, status);
    }

    /** GET /api/reservations/{id} */
    @GetMapping("/{id}")
    public ReservationResponse getReservationById(@PathVariable String id) {
        return reservationService.getReservationById(id);
    }

    /** POST /api/reservations — public endpoint for customers */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse createReservation(@Valid @RequestBody ReservationRequest request) {
        return reservationService.createReservation(request);
    }

    /** PATCH /api/reservations/{id}/status?status=confirmed */
    @PatchMapping("/{id}/status")
    public ReservationResponse updateStatus(
            @PathVariable String id,
            @RequestParam ReservationStatus status
    ) {
        return reservationService.updateReservationStatus(id, status);
    }

    /** PATCH /api/reservations/{id}/table?tableNo=Bàn+05 */
    @PatchMapping("/{id}/table")
    public ReservationResponse assignTable(
            @PathVariable String id,
            @RequestParam String tableNo
    ) {
        return reservationService.assignTable(id, tableNo);
    }

    /** DELETE /api/reservations/{id} */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReservation(@PathVariable String id) {
        reservationService.deleteReservation(id);
    }
}
