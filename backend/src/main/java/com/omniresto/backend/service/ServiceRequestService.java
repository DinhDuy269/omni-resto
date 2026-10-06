package com.omniresto.backend.service;

import com.omniresto.backend.domain.ServiceRequestEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.ServiceRequestStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.servicerequest.ServiceRequestCreateRequest;
import com.omniresto.backend.model.servicerequest.ServiceRequestResponse;
import com.omniresto.backend.repository.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final TableSessionService tableSessionService;
    private final SimpMessagingTemplate messagingTemplate;

    // Giới hạn tần suất gọi phục vụ: Tối thiểu cách nhau 15 giây để chống spam
    public static final int RATE_LIMIT_SECONDS = 15;

    @Transactional
    public ServiceRequestResponse createServiceRequest(String sessionToken, ServiceRequestCreateRequest request) {
        TableSessionEntity session = tableSessionService.validateAndTouchSessionWithLock(sessionToken);

        // Chống spam gọi phục vụ liên tục
        LocalDateTime rateLimitThreshold = LocalDateTime.now().minusSeconds(RATE_LIMIT_SECONDS);
        int recentCount = serviceRequestRepository.countByTableSessionIdAndCreatedAtAfter(session.getId(), rateLimitThreshold);
        if (recentCount > 0) {
            throw new BadRequestException("Quý khách vừa gửi yêu cầu hỗ trợ. Nhân viên đang đến bàn, vui lòng chờ trong giây lát!");
        }

        ServiceRequestEntity entity = ServiceRequestEntity.builder()
                .tableSessionId(session.getId())
                .tableId(session.getTableId())
                .tableNo(session.getTableNo())
                .requestType(request.getRequestType())
                .note(request.getNote() != null ? request.getNote().trim() : null)
                .status(ServiceRequestStatus.PENDING)
                .build();
        entity.setId("sr-" + UUID.randomUUID().toString().substring(0, 8));

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        log.info("🔔 Service request {} created for {}: {}", saved.getId(), saved.getTableNo(), saved.getRequestType());

        ServiceRequestResponse response = mapToResponse(saved);

        // Broadcast qua WebSocket tới màn hình thu ngân và POS
        try {
            messagingTemplate.convertAndSend("/topic/service-requests", Map.of(
                    "eventType", "SERVICE_REQUEST_CREATED",
                    "request", response
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast service request: {}", e.getMessage());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestResponse> getActiveRequests() {
        return serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ServiceRequestResponse resolveRequest(String id, String staffId) {
        ServiceRequestEntity entity = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Yêu cầu phục vụ không tồn tại: " + id));

        entity.setStatus(ServiceRequestStatus.RESOLVED);
        entity.setResolvedAt(LocalDateTime.now());
        entity.setResolvedByStaffId(staffId != null ? staffId : "STAFF-POS");

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        log.info("✅ Service request {} resolved by {}", saved.getId(), entity.getResolvedByStaffId());

        ServiceRequestResponse response = mapToResponse(saved);

        try {
            messagingTemplate.convertAndSend("/topic/service-requests", Map.of(
                    "eventType", "SERVICE_REQUEST_RESOLVED",
                    "request", response
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast service request resolution: {}", e.getMessage());
        }

        return response;
    }

    @Transactional
    public void resolveAllForTable(String tableNo, String staffId) {
        List<ServiceRequestEntity> activeList = serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.PENDING);
        for (ServiceRequestEntity req : activeList) {
            if (req.getTableNo().equalsIgnoreCase(tableNo)) {
                req.setStatus(ServiceRequestStatus.RESOLVED);
                req.setResolvedAt(LocalDateTime.now());
                req.setResolvedByStaffId(staffId != null ? staffId : "STAFF-POS");
                serviceRequestRepository.save(req);
            }
        }
        try {
            messagingTemplate.convertAndSend("/topic/service-requests", Map.of(
                    "eventType", "SERVICE_REQUEST_TABLE_RESOLVED",
                    "tableNo", tableNo
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast table resolution: {}", e.getMessage());
        }
    }

    private ServiceRequestResponse mapToResponse(ServiceRequestEntity entity) {
        return ServiceRequestResponse.builder()
                .id(entity.getId())
                .tableSessionId(entity.getTableSessionId())
                .tableId(entity.getTableId())
                .tableNo(entity.getTableNo())
                .requestType(entity.getRequestType())
                .note(entity.getNote())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .resolvedAt(entity.getResolvedAt())
                .resolvedByStaffId(entity.getResolvedByStaffId())
                .build();
    }
}
