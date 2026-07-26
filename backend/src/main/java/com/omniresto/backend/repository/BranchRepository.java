package com.omniresto.backend.repository;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.enums.BranchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<BranchEntity, String> {
    Optional<BranchEntity> findByCode(String code);
    List<BranchEntity> findByStatus(BranchStatus status);
}
