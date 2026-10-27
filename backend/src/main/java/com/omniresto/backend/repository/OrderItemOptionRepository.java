package com.omniresto.backend.repository;

import com.omniresto.backend.domain.OrderItemOptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemOptionRepository extends JpaRepository<OrderItemOptionEntity, String> {

    List<OrderItemOptionEntity> findByOrderItem_Id(String orderItemId);

    List<OrderItemOptionEntity> findByOrderItem_IdIn(List<String> orderItemIds);
}
