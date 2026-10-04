package com.omniresto.backend.repository;

import com.omniresto.backend.domain.CustomerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<CustomerEntity, String> {
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    List<CustomerEntity> findAllByOrderByCreatedAtDesc();

    Optional<CustomerEntity> findByPhone(String phone);

    Optional<CustomerEntity> findByEmail(String email);

    Optional<CustomerEntity> findByPhoneOrEmail(String phone, String email);
}