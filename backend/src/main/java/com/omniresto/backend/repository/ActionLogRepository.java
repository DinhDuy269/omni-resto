package com.omniresto.backend.repository;

import com.omniresto.backend.domain.ActionLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActionLogRepository extends JpaRepository<ActionLogEntity, String> {

    Page<ActionLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT l FROM ActionLogEntity l WHERE " +
           "(:screen IS NULL OR :screen = '' OR LOWER(l.screen) = LOWER(:screen)) AND " +
           "(:query IS NULL OR :query = '' OR LOWER(l.userName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(l.feature) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(l.action) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY l.createdAt DESC")
    Page<ActionLogEntity> searchLogs(
            @Param("screen") String screen,
            @Param("query") String query,
            Pageable pageable
    );

    long countByCreatedAtAfter(LocalDateTime time);

    @Query("SELECT l.screen, COUNT(l) FROM ActionLogEntity l GROUP BY l.screen ORDER BY COUNT(l) DESC")
    List<Object[]> countLogsByScreen();
}
