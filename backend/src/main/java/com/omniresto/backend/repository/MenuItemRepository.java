package com.omniresto.backend.repository;

import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItemEntity, String> {
    Optional<MenuItemEntity> findByCode(String code);
    List<MenuItemEntity> findByCategoryId(String categoryId);
    List<MenuItemEntity> findByStatus(MenuStatus status);
}
