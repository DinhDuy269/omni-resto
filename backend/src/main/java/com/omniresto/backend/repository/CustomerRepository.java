package com.omniresto.backend.repository;

import com.omniresto.backend.domain.CustomerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerRepository extends JpaRepository<CustomerEntity, String> {
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    List<CustomerEntity> findAllByOrderByCreatedAtDesc();
}