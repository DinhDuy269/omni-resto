package com.omniresto.backend.repository;

import com.omniresto.backend.domain.ServiceRequestEntity;
import com.omniresto.backend.domain.enums.ServiceRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequestEntity, String> {

    List<ServiceRequestEntity> findByStatusOrderByCreatedAtDesc(ServiceRequestStatus status);

    List<ServiceRequestEntity> findByTableIdAndStatusOrderByCreatedAtDesc(String tableId, ServiceRequestStatus status);

    int countByTableSessionIdAndCreatedAtAfter(String tableSessionId, LocalDateTime since);
}
