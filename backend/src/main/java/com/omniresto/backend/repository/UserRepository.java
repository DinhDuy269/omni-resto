package com.omniresto.backend.repository;

import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> {
    Optional<UserEntity> findByEmail(String email);
    List<UserEntity> findByBranchId(String branchId);
    List<UserEntity> findByRole(RoleType role);
}
