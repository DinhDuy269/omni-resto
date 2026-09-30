package com.omniresto.backend.repository;

import com.omniresto.backend.domain.ReservationEntity;
import com.omniresto.backend.domain.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, String> {

    List<ReservationEntity> findByReservationDate(LocalDate date);

    List<ReservationEntity> findByReservationDateAndStatus(LocalDate date, ReservationStatus status);

    List<ReservationEntity> findByStatus(ReservationStatus status);
}
