package com.omniresto.backend.repository;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {
    Optional<OrderEntity> findByOrderNumber(String orderNumber);
    List<OrderEntity> findByStatus(OrderStatus status);
}
