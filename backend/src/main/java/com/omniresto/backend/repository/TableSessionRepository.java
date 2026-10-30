package com.omniresto.backend.repository;

import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TableSessionRepository extends JpaRepository<TableSessionEntity, String> {
    Optional<TableSessionEntity> findBySessionToken(String sessionToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TableSessionEntity s WHERE s.id = :id")
    Optional<TableSessionEntity> findByIdWithLock(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TableSessionEntity s WHERE s.sessionToken = :sessionToken")
    Optional<TableSessionEntity> findBySessionTokenWithLock(@Param("sessionToken") String sessionToken);

    Optional<TableSessionEntity> findFirstByTableIdAndStatus(String tableId, TableSessionStatus status);

    List<TableSessionEntity> findByTableIdAndStatus(String tableId, TableSessionStatus status);

    List<TableSessionEntity> findByTableIdAndStatusIn(String tableId, java.util.Collection<TableSessionStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TableSessionEntity s WHERE s.tableId = :tableId AND s.status IN :statuses")
    List<TableSessionEntity> findByTableIdAndStatusInWithLock(@Param("tableId") String tableId, @Param("statuses") java.util.Collection<TableSessionStatus> statuses);

    List<TableSessionEntity> findByStatusAndExpiresAtBefore(TableSessionStatus status, LocalDateTime now);
}
