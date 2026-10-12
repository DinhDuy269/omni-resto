package com.omniresto.backend.controller;

import com.omniresto.backend.model.base.response.ApiResponse;
import com.omniresto.backend.model.reservation.request.AssignTableRequest;
import com.omniresto.backend.model.reservation.request.OfflineReservationRequest;
import com.omniresto.backend.model.reservation.request.OnlineReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.service.ReservationService;
import com.omniresto.backend.service.ReservationSseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/tables/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;
    private final ReservationSseService sseService;

    // Endpoint nhận stream Realtime SSE cho Admin
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return sseService.createConnection();
    }

    @PostMapping("/online")
    public ResponseEntity<ApiResponse<ReservationResponse>> createOnline(@Valid @RequestBody OnlineReservationRequest request) {
        ReservationResponse res = reservationService.createOnlineReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đặt bàn trực tuyến thành công!", res));
    }

    @PostMapping("/offline")
    public ResponseEntity<ApiResponse<ReservationResponse>> createOffline(@Valid @RequestBody OfflineReservationRequest request) {
        ReservationResponse res = reservationService.createOfflineReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo đơn đặt bàn thành công!", res));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getAll(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getAll(status)));
    }

    @GetMapping("/track/{code}")
    public ResponseEntity<ApiResponse<ReservationResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getByCode(code)));
    }

    @PutMapping("/{id}/assign-table")
    public ResponseEntity<ApiResponse<ReservationResponse>> assignTable(
            @PathVariable String id,
            @Valid @RequestBody AssignTableRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xếp bàn thành công!", reservationService.assignTable(id, request)));
    }

    @PutMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<ReservationResponse>> checkIn(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Khách đã nhận bàn thành công!", reservationService.checkIn(id)));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(
            @PathVariable String id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Hủy đặt bàn thành công!", reservationService.cancelReservation(id, reason)));
    }

    @GetMapping("/tables")
    public ResponseEntity<ApiResponse<List<com.omniresto.backend.domain.TableEntity>>> getTables() {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getAllTables()));
    }
}