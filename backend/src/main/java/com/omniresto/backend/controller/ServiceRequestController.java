package com.omniresto.backend.controller;

import com.omniresto.backend.model.servicerequest.ServiceRequestCreateRequest;
import com.omniresto.backend.model.servicerequest.ServiceRequestResponse;
import com.omniresto.backend.service.ServiceRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service-requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    @PostMapping
    public ResponseEntity<ServiceRequestResponse> createRequest(
            @Valid @RequestBody ServiceRequestCreateRequest request,
            @RequestHeader("X-Table-Session") String sessionToken
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(serviceRequestService.createServiceRequest(sessionToken, request));
    }

    @GetMapping("/active")
    public ResponseEntity<List<ServiceRequestResponse>> getActiveRequests() {
        return ResponseEntity.ok(serviceRequestService.getActiveRequests());
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ServiceRequestResponse> resolveRequest(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId
    ) {
        return ResponseEntity.ok(serviceRequestService.resolveRequest(id, staffId));
    }

    @PostMapping("/resolve-table")
    public ResponseEntity<Map<String, String>> resolveTableRequests(
            @RequestParam String tableNo,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId
    ) {
        serviceRequestService.resolveAllForTable(tableNo, staffId);
        return ResponseEntity.ok(Map.of("message", "Đã xử lý tất cả yêu cầu phục vụ cho " + tableNo));
    }
}
