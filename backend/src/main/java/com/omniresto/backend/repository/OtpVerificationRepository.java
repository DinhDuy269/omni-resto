package com.omniresto.backend.repository;

import com.omniresto.backend.domain.OtpVerificationEntity;
import com.omniresto.backend.domain.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerificationEntity, UUID> {

    Optional<OtpVerificationEntity> findFirstByEmailAndOtpCodeAndPurposeAndIsUsedFalseAndExpiredAtAfter(
            String email,
            String otpCode,
            OtpPurpose purpose,
            LocalDateTime now
    );

    Optional<OtpVerificationEntity> findFirstByEmailAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(
            String email,
            OtpPurpose purpose
    );
}