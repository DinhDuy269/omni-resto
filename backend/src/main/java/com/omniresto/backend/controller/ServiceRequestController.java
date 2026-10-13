package com.omniresto.backend.controller;

import com.omniresto.backend.model.servicerequest.ServiceRequestCreateRequest;
import com.omniresto.backend.model.servicerequest.ServiceRequestResponse;
import com.omniresto.backend.service.ServiceRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service-requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceRequestResponse createRequest(
            @Valid @RequestBody ServiceRequestCreateRequest request,
            @RequestHeader("X-Table-Session") String sessionToken
    ) {
        return serviceRequestService.createServiceRequest(sessionToken, request);
    }

    @GetMapping("/active")
    public List<ServiceRequestResponse> getActiveRequests() {
        return serviceRequestService.getActiveRequests();
    }

    @PostMapping("/{id}/resolve")
    public ServiceRequestResponse resolveRequest(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId
    ) {
        return serviceRequestService.resolveRequest(id, staffId);
    }

    @PostMapping("/resolve-table")
    public Map<String, String> resolveTableRequests(
            @RequestParam String tableNo,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId
    ) {
        serviceRequestService.resolveAllForTable(tableNo, staffId);
        return Map.of("message", "Đã xử lý tất cả yêu cầu phục vụ cho " + tableNo);
    }
}
