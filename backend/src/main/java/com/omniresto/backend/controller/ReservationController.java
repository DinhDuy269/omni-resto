package com.omniresto.backend.controller;

import com.omniresto.backend.model.base.response.ApiResponse;
import com.omniresto.backend.model.reservation.request.AssignTableRequest;
import com.omniresto.backend.model.reservation.request.OfflineReservationRequest;
import com.omniresto.backend.model.reservation.request.OnlineReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    // 1. Khách đặt bàn Online
    @PostMapping("/online")
    public ResponseEntity<ApiResponse<ReservationResponse>> createOnline(@Valid @RequestBody OnlineReservationRequest request) {
        ReservationResponse res = reservationService.createOnlineReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đặt bàn trực tuyến thành công!", res));
    }

    // 2. Nhân viên tạo đơn Offline (Điện thoại hoặc tại quán)
    @PostMapping("/offline")
    public ResponseEntity<ApiResponse<ReservationResponse>> createOffline(@Valid @RequestBody OfflineReservationRequest request) {
        ReservationResponse res = reservationService.createOfflineReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo đơn đặt bàn thành công!", res));
    }

    // 3. Lấy danh sách đặt bàn (hỗ trợ lọc ?status=PENDING, CONFIRMED, ...)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getAll(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getAll(status)));
    }

    // 4. Tra cứu thông tin đặt bàn qua mã code
    @GetMapping("/track/{code}")
    public ResponseEntity<ApiResponse<ReservationResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getByCode(code)));
    }

    // 5. Nhân viên gán bàn cho đơn PENDING
    @PutMapping("/{id}/assign-table")
    public ResponseEntity<ApiResponse<ReservationResponse>> assignTable(
            @PathVariable String id,
            @Valid @RequestBody AssignTableRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xếp bàn thành công!", reservationService.assignTable(id, request)));
    }

    // 6. Khách đến nhận bàn (Check-in)
    @PutMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<ReservationResponse>> checkIn(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Khách đã nhận bàn thành công!", reservationService.checkIn(id)));
    }

    // 7. Hủy đơn đặt bàn
    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(
            @PathVariable String id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Hủy đặt bàn thành công!", reservationService.cancelReservation(id, reason)));
    }

    // Lấy danh sách bàn phục vụ xếp chỗ (nằm trong /api/tables/reservations/tables)
    @GetMapping("/tables")
    public ResponseEntity<ApiResponse<List<com.omniresto.backend.domain.TableEntity>>> getTables() {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getAllTables()));
    }
}