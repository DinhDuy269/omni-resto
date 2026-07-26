package com.omniresto.backend.repository;

import com.omniresto.backend.domain.BranchMenuItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchMenuItemRepository extends JpaRepository<BranchMenuItemEntity, String> {
    List<BranchMenuItemEntity> findByBranchId(String branchId);
    Optional<BranchMenuItemEntity> findByBranchIdAndMenuItemId(String branchId, String menuItemId);
}
