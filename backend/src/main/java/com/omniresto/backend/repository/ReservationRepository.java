package com.omniresto.backend.repository;

import com.omniresto.backend.domain.ReservationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    List<ReservationEntity> findAllByOrderByCreatedAtDesc();

    List<ReservationEntity> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT r FROM ReservationEntity r " +
            "WHERE r.customerPhone = :phone " +
            "AND r.status IN ('PENDING', 'CONFIRMED')")
    List<ReservationEntity> findActiveReservationsByPhone(@Param("phone") String phone);

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

    @Query("SELECT r FROM ReservationEntity r " +
            "WHERE r.status IN ('PENDING', 'CONFIRMED') " +
            "AND r.reservationTime < :threshold")
    List<ReservationEntity> findExpiredReservations(@Param("threshold") LocalDateTime threshold);

    // Query phân trang kết hợp lọc ca (tính theo phút trong ngày), trạng thái, ngày và từ khóa tìm kiếm
    @Query(
            value = "SELECT r FROM ReservationEntity r WHERE " +
                    "(:status IS NULL OR :status = '' OR r.status = :status) " +
                    "AND (:search IS NULL OR :search = '' OR " +
                    "     LOWER(r.customerName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                    "     r.customerPhone LIKE CONCAT('%', :search, '%') OR " +
                    "     LOWER(r.reservationCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                    "AND (:startDate IS NULL OR r.reservationTime >= :startDate) " +
                    "AND (:endDate IS NULL OR r.reservationTime <= :endDate) " +
                    "AND (:isShiftFilter = false OR " +
                    "     (:isOvernight = false AND (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) >= :startMinute AND (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) < :endMinute) OR " +
                    "     (:isOvernight = true AND ((HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) >= :startMinute OR (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) < :endMinute)))",
            countQuery = "SELECT COUNT(r) FROM ReservationEntity r WHERE " +
                    "(:status IS NULL OR :status = '' OR r.status = :status) " +
                    "AND (:search IS NULL OR :search = '' OR " +
                    "     LOWER(r.customerName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                    "     r.customerPhone LIKE CONCAT('%', :search, '%') OR " +
                    "     LOWER(r.reservationCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                    "AND (:startDate IS NULL OR r.reservationTime >= :startDate) " +
                    "AND (:endDate IS NULL OR r.reservationTime <= :endDate) " +
                    "AND (:isShiftFilter = false OR " +
                    "     (:isOvernight = false AND (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) >= :startMinute AND (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) < :endMinute) OR " +
                    "     (:isOvernight = true AND ((HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) >= :startMinute OR (HOUR(r.reservationTime) * 60 + MINUTE(r.reservationTime)) < :endMinute)))"
    )
    Page<ReservationEntity> findReservationsPaged(
            @Param("status") String status,
            @Param("search") String search,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("isShiftFilter") boolean isShiftFilter,
            @Param("isOvernight") boolean isOvernight,
            @Param("startMinute") Integer startMinute,
            @Param("endMinute") Integer endMinute,
            Pageable pageable
    );
}