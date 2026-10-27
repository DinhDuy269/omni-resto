package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.OperatingShift;
import com.omniresto.backend.model.base.response.ApiResponse;
import com.omniresto.backend.model.reservation.request.AssignTableRequest;
import com.omniresto.backend.model.reservation.request.OfflineReservationRequest;
import com.omniresto.backend.model.reservation.request.OnlineReservationRequest;
import com.omniresto.backend.model.reservation.response.ReservationResponse;
import com.omniresto.backend.service.ReservationService;
import com.omniresto.backend.service.ReservationSseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tables/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;
    private final ReservationSseService sseService;

    // Endpoint stream Realtime SSE cho Admin
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return sseService.createConnection();
    }

    // Endpoint kiểm tra số điện thoại có đơn đang chờ phục vụ hay không (Chống spam)
    @GetMapping("/check-phone")
    public ResponseEntity<ApiResponse<Boolean>> checkPhoneHasActiveBooking(@RequestParam String phone) {
        boolean hasActive = reservationService.hasActiveBookingByPhone(phone);
        return ResponseEntity.ok(ApiResponse.success(hasActive));
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

    // Endpoint phân trang kết hợp lọc theo ca, trạng thái, ngày và tìm kiếm
    @GetMapping("/paged")
    public ResponseEntity<ApiResponse<Page<ReservationResponse>>> getReservationsPaged(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) OperatingShift shift,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ReservationResponse> pageData = reservationService.getReservationsPaged(
                status,
                search,
                date,
                shift,
                pageable
        );
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đặt bàn thành công", pageData));
    }
}