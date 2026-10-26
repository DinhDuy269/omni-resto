package com.omniresto.backend.repository;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {

    Optional<OrderEntity> findByOrderNumber(String orderNumber);

    List<OrderEntity> findByStatus(OrderStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OrderEntity o WHERE o.id = :id")
    Optional<OrderEntity> findByIdWithLock(@Param("id") String id);

    @Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items ORDER BY o.createdAt DESC")
    List<OrderEntity> findAllWithItems();

    @Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<OrderEntity> findByStatusWithItems(@Param("status") OrderStatus status);

    Optional<OrderEntity> findFirstByTableSessionIdAndStatusInOrderByCreatedAtDesc(
            String tableSessionId,
            Collection<OrderStatus> statuses
    );

    @Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items WHERE o.tableSessionId = :tableSessionId ORDER BY o.createdAt DESC")
    List<OrderEntity> findByTableSessionIdWithItems(@Param("tableSessionId") String tableSessionId);

    List<OrderEntity> findByTableSessionIdOrderByCreatedAtDesc(String tableSessionId);

    long countByCustomerIdAndStatusNot(String customerId, OrderStatus status);

    List<OrderEntity> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<OrderEntity> findByTableIdAndStatusNotIn(String tableId, Collection<OrderStatus> statuses);

    List<OrderEntity> findByTableNoAndStatusNotIn(String tableNo, Collection<OrderStatus> statuses);
}
