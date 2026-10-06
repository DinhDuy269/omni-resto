package com.omniresto.backend.repository;

import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TableRepository extends JpaRepository<TableEntity, String> {
    List<TableEntity> findByStatus(TableStatus status);
    Optional<TableEntity> findByQrSecretToken(String qrSecretToken);
    Optional<TableEntity> findByTableNo(String tableNo);
}
