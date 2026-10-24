package com.omniresto.backend.repository;

import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItemEntity, String> {
    Optional<MenuItemEntity> findByCode(String code);
    List<MenuItemEntity> findByCategoryId(String categoryId);
    List<MenuItemEntity> findByStatus(MenuStatus status);

    @Query("SELECT m FROM MenuItemEntity m LEFT JOIN FETCH m.category WHERE m.status = :status")
    List<MenuItemEntity> findByStatusWithCategory(@Param("status") MenuStatus status);

    @Query("SELECT m FROM MenuItemEntity m LEFT JOIN FETCH m.category")
    List<MenuItemEntity> findAllWithCategory();

    List<MenuItemEntity> findByMealPeriodsContainingIgnoreCase(String period);
    long countByImageUrl(String imageUrl);
    long countByImageUrlAndIdNot(String imageUrl, String id);
}
