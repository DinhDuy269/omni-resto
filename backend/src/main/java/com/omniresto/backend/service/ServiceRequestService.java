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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final TableSessionService tableSessionService;
    private final ActionLogService actionLogService;

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
                .tableNo(session.getTableNo())
                .requestType(request.getRequestType())
                .note(request.getNote())
                .status(ServiceRequestStatus.pending)
                .build();
        entity.setId("req-" + UUID.randomUUID().toString().substring(0, 8));

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        log.info("🔔 Service request {} created for {}: {}", saved.getId(), saved.getTableNo(), saved.getRequestType());

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestResponse> getActiveRequests() {
        return serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.pending)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public ServiceRequestResponse resolveRequest(String requestId, String staffId) {
        ServiceRequestEntity entity = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ: " + requestId));

        entity.setStatus(ServiceRequestStatus.resolved);
        entity.setResolvedAt(LocalDateTime.now());
        entity.setResolvedByStaffId(staffId != null ? staffId : "STAFF-POS");

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        log.info("✅ Service request {} resolved by {}", saved.getId(), entity.getResolvedByStaffId());
        actionLogService.record("Sơ Đồ Bàn", "Xử lý gọi nhân viên", "Đã xử lý xong yêu cầu hỗ trợ của bàn " + saved.getTableNo());

        return mapToResponse(saved);
    }

    @Transactional
    public void resolveAllForTable(String tableNo, String staffId) {
        List<ServiceRequestEntity> activeList = serviceRequestRepository.findByTableNoIgnoreCaseAndStatus(tableNo, ServiceRequestStatus.pending);
        if (!activeList.isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            String resolvedBy = staffId != null ? staffId : "STAFF-POS";
            activeList.forEach(req -> {
                req.setStatus(ServiceRequestStatus.resolved);
                req.setResolvedAt(now);
                req.setResolvedByStaffId(resolvedBy);
            });
            serviceRequestRepository.saveAll(activeList);
            log.info("✅ Resolved {} service requests for table {} by {}", activeList.size(), tableNo, resolvedBy);
            actionLogService.record("Sơ Đồ Bàn", "Xử lý gọi nhân viên", "Đã xử lý toàn bộ " + activeList.size() + " yêu cầu hỗ trợ của bàn " + tableNo);
        }
    }

    private ServiceRequestResponse mapToResponse(ServiceRequestEntity entity) {
        return ServiceRequestResponse.builder()
                .id(entity.getId())
                .tableSessionId(entity.getTableSessionId())
                .tableNo(entity.getTableNo())
                .requestType(entity.getRequestType())
                .note(entity.getNote())
                .status(entity.getStatus())
                .resolvedAt(entity.getResolvedAt())
                .resolvedByStaffId(entity.getResolvedByStaffId())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
