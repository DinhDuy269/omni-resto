package com.omniresto.backend.repository;

import com.omniresto.backend.domain.EventEntity;
import com.omniresto.backend.domain.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, String> {

    List<EventEntity> findByStatus(EventStatus status);

    List<EventEntity> findByStatusOrderByEventDateAsc(EventStatus status);

    List<EventEntity> findByEventDateGreaterThanEqualOrderByEventDateAsc(LocalDate date);

    List<EventEntity> findByIsFeaturedTrueOrderByEventDateAsc();

}
