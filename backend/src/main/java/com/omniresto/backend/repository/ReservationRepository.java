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

    // 👉 1. Lấy toàn bộ đơn sắp xếp theo thời gian tạo mới nhất lên đầu tiên (F5 không bị trôi)
    List<ReservationEntity> findAllByOrderByCreatedAtDesc();

    // 👉 2. Lấy đơn theo trạng thái (PENDING, CONFIRMED, ...) sắp xếp mới nhất lên đầu tiên
    List<ReservationEntity> findByStatusOrderByCreatedAtDesc(String status);

    // [Chống Spam] Tìm các đơn đặt bàn đang còn hiệu lực (PENDING hoặc CONFIRMED) theo số điện thoại
    @Query("SELECT r FROM ReservationEntity r " +
            "WHERE r.customerPhone = :phone " +
            "AND r.status IN ('PENDING', 'CONFIRMED')")
    List<ReservationEntity> findActiveReservationsByPhone(@Param("phone") String phone);

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
    @Query("SELECT r FROM ReservationEntity r " +
            "WHERE r.status IN ('PENDING', 'CONFIRMED') " +
            "AND r.reservationTime < :threshold")
    List<ReservationEntity> findExpiredReservations(@Param("threshold") LocalDateTime threshold);
}