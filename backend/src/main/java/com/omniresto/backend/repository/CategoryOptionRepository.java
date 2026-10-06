package com.omniresto.backend.repository;

import com.omniresto.backend.domain.CategoryOptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryOptionRepository extends JpaRepository<CategoryOptionEntity, String> {

    List<CategoryOptionEntity> findByCategoryIdOrderByDisplayOrderAsc(String categoryId);

    List<CategoryOptionEntity> findByCategoryIdAndStatusOrderByDisplayOrderAsc(String categoryId, String status);
}
