package com.omniresto.backend.repository;

import com.omniresto.backend.domain.VoucherRedemptionEntity;
import com.omniresto.backend.domain.enums.RedemptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemptionEntity, String> {

    long countByVoucherIdAndCustomerIdAndStatus(String voucherId, String customerId, RedemptionStatus status);

    Optional<VoucherRedemptionEntity> findByOrderIdAndStatus(String orderId, RedemptionStatus status);
}
