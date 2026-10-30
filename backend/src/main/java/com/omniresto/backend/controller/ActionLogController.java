package com.omniresto.backend.controller;

import com.omniresto.backend.model.actionlog.ActionLogRequest;
import com.omniresto.backend.model.actionlog.ActionLogResponse;
import com.omniresto.backend.service.ActionLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST API Quản lý và Truy vấn Nhật ký thao tác (Action Logs).
 * Base URL: /api/action-logs
 */
@RestController
@RequestMapping("/api/action-logs")
@RequiredArgsConstructor
public class ActionLogController {

    private final ActionLogService actionLogService;

    /**
     * Ghi nhận một thao tác mới (từ UI admin gửi lên)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ActionLogResponse> recordAction(@Valid @RequestBody ActionLogRequest request) {
        ActionLogResponse response = actionLogService.logAction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy danh sách lịch sử thao tác với phân trang và lọc
     */
    @GetMapping
    public ResponseEntity<Page<ActionLogResponse>> getLogs(
            @RequestParam(required = false) String screen,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<ActionLogResponse> logs = actionLogService.getLogs(screen, query, page, size);
        return ResponseEntity.ok(logs);
    }

    /**
     * Thống kê tổng hợp hoạt động
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(actionLogService.getStats());
    }
}
