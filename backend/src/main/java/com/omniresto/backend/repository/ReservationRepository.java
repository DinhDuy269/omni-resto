package com.omniresto.backend.repository;

import com.omniresto.backend.domain.ReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, String> {

    Optional<ReservationEntity> findByReservationCode(String reservationCode);

    List<ReservationEntity> findByStatusOrderByReservationTimeAsc(String status);

    // Kiểm tra bàn có bị trùng lịch trong khoảng thời gian [startTime, endTime] hay không
    @Query("SELECT r FROM ReservationEntity r WHERE r.table.id = :tableId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.reservationTime BETWEEN :startTime AND :endTime " +
            "AND (:excludeReservationId IS NULL OR r.id != :excludeReservationId)")
    List<ReservationEntity> findConflictingReservations(
            @Param("tableId") String tableId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("excludeReservationId") String excludeReservationId
    );

    // Tìm các đơn đặt bàn chưa nhận bàn (PENDING hoặc CONFIRMED) đã quá giờ hẹn
    @org.springframework.data.jpa.repository.Query(
            "SELECT r FROM ReservationEntity r " +
                    "WHERE r.status IN ('PENDING', 'CONFIRMED') " +
                    "AND r.reservationTime < :threshold"
    )
    List<ReservationEntity> findExpiredReservations(@org.springframework.data.repository.query.Param("threshold") java.time.LocalDateTime threshold);
}