package com.omniresto.backend.repository;

import com.omniresto.backend.domain.PaymentTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, String> {
    Optional<PaymentTransactionEntity> findByTransactionReference(String transactionReference);

    List<PaymentTransactionEntity> findByOrderId(String orderId);
}
