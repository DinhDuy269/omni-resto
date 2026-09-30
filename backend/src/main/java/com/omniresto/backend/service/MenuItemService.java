package com.omniresto.backend.service;

import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.menu.request.MenuItemCreateRequest;
import com.omniresto.backend.model.menu.request.MenuItemUpdateRequest;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.repository.CategoryRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    public List<MenuItemResponse> getAllMenuItems() {
        return getAllMenuItems(null);
    }

    public List<MenuItemResponse> getAllMenuItems(String period) {
        List<MenuItemEntity> items;
        if (period != null && !period.isBlank()) {
            items = menuItemRepository.findByMealPeriodsContainingIgnoreCase(period.trim());
        } else {
            items = menuItemRepository.findAll();
        }
        return items.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MenuItemResponse getMenuItemById(String id) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với ID: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public MenuItemResponse createMenuItem(MenuItemCreateRequest request) {
        String categoryId = request.getEffectiveCategoryId();
        if (categoryId == null || categoryId.isBlank()) {
            throw new BadRequestException("Mã danh mục (categoryId) là bắt buộc");
        }

        CategoryEntity category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục món ăn với ID: " + categoryId));

        String code = request.getEffectiveCode();
        if (code == null || code.isBlank()) {
            code = "MN-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }

        BigDecimal price = request.getEffectivePrice();
        if (price == null) {
            price = BigDecimal.ZERO;
        }

        String mealPeriods = request.getEffectiveMealPeriods();
        if (mealPeriods == null || mealPeriods.isBlank()) {
            mealPeriods = "MORNING,NOON,EVENING";
        }

        MenuItemEntity entity = MenuItemEntity.builder()
                .code(code)
                .name(request.getEffectiveName())
                .category(category)
                .basePrice(price)
                .description(request.getEffectiveDescription())
                .ingredients(request.getEffectiveIngredients())
                .mealPeriods(mealPeriods)
                .status(request.getEffectiveStatus() != null ? request.getEffectiveStatus() : MenuStatus.available)
                .isBestSeller(Boolean.TRUE.equals(request.getEffectiveIsBestSeller()))
                .imageUrl(request.getEffectiveImageUrl())
                .build();
        entity.setId("m-" + UUID.randomUUID().toString().substring(0, 8));

        MenuItemEntity saved = menuItemRepository.save(entity);
        return mapToResponse(saved);
    }

    @Transactional
    public MenuItemResponse updateMenuItem(String id, MenuItemUpdateRequest request) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với ID: " + id));

        MenuItemUpdateRequest actual = request.getActual();

        if (actual.getName() != null && !actual.getName().isBlank()) {
            entity.setName(actual.getName());
        }
        if (actual.getEffectivePrice() != null) {
            entity.setBasePrice(actual.getEffectivePrice());
        }
        if (actual.getDescription() != null) {
            entity.setDescription(actual.getDescription());
        }
        if (actual.getIngredients() != null) {
            entity.setIngredients(actual.getIngredients());
        }
        if (actual.getMealPeriods() != null && !actual.getMealPeriods().isBlank()) {
            entity.setMealPeriods(actual.getMealPeriods());
        }
        if (actual.getStatus() != null) {
            entity.setStatus(actual.getStatus());
        }
        if (actual.getIsBestSeller() != null) {
            entity.setIsBestSeller(actual.getIsBestSeller());
        }
        if (actual.getEffectiveImageUrl() != null) {
            entity.setImageUrl(actual.getEffectiveImageUrl());
        }

        if (actual.getCategoryId() != null && !actual.getCategoryId().isBlank()) {
            CategoryEntity category = categoryRepository.findById(actual.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục món ăn với ID: " + actual.getCategoryId()));
            entity.setCategory(category);
        }

        MenuItemEntity updated = menuItemRepository.save(entity);
        return mapToResponse(updated);
    }

    @Transactional
    public MenuItemResponse updateMenuItemStatus(String id, MenuStatus status) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với ID: " + id));
        entity.setStatus(status);
        MenuItemEntity updated = menuItemRepository.save(entity);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteMenuItem(String id) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với ID: " + id));
        menuItemRepository.delete(entity);
    }

    private MenuItemResponse mapToResponse(MenuItemEntity entity) {
        MenuItemResponse res = new MenuItemResponse();
        res.setId(entity.getId());
        res.setCode(entity.getCode());
        res.setName(entity.getName());

        if (entity.getCategory() != null) {
            res.setCategoryId(entity.getCategory().getId());
            res.setCategory(entity.getCategory().getName());
        }

        res.setBasePrice(entity.getBasePrice());
        res.setPrice(entity.getBasePrice());
        res.setDescription(entity.getDescription());
        res.setIngredients(entity.getIngredients());
        res.setMealPeriods(entity.getMealPeriods());
        res.setStatus(entity.getStatus());
        res.setIsBestSeller(Boolean.TRUE.equals(entity.getIsBestSeller()));
        res.setImage(entity.getImageUrl());
        res.setImageUrl(entity.getImageUrl());
        res.setCreatedAt(entity.getCreatedAt());
        res.setUpdatedAt(entity.getUpdatedAt());
        return res;
    }
}
