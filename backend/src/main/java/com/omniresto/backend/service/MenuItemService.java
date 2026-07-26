package com.omniresto.backend.service;

import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.model.menu.request.MenuItemRequest;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.repository.CategoryRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    public List<MenuItemResponse> getAllMenuItems() {
        return menuItemRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MenuItemResponse getMenuItemById(String id) {
        return menuItemRepository.findById(id)
                .map(this::mapToResponse)
                .orElse(null);
    }

    public MenuItemResponse createMenuItem(MenuItemRequest request) {
        CategoryEntity category = categoryRepository.findById(request.getCategoryId() != null ? request.getCategoryId() : "cat-01")
                .orElse(null);

        MenuItemEntity entity = MenuItemEntity.builder()
                .code(request.getCode())
                .name(request.getName())
                .category(category)
                .basePrice(request.getBasePrice())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : MenuStatus.available)
                .isBestSeller(request.getIsBestSeller() != null ? request.getIsBestSeller() : false)
                .imageUrl(request.getImageUrl() != null ? request.getImageUrl() : request.getImage())
                .build();
        entity.setId("m-" + UUID.randomUUID().toString().substring(0, 8));

        MenuItemEntity saved = menuItemRepository.save(entity);
        return mapToResponse(saved);
    }

    public MenuItemResponse updateMenuItemStatus(String id, MenuStatus status) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        entity.setStatus(status);
        MenuItemEntity updated = menuItemRepository.save(entity);
        return mapToResponse(updated);
    }

    private MenuItemResponse mapToResponse(MenuItemEntity entity) {
        MenuItemResponse res = new MenuItemResponse();
        res.setId(entity.getId());
        res.setCode(entity.getCode());
        res.setName(entity.getName());
        res.setCategoryId(entity.getCategory() != null ? entity.getCategory().getId() : "cat-01");
        res.setCategory(entity.getCategory() != null ? entity.getCategory().getName() : "Phở & Bún");
        res.setBasePrice(entity.getBasePrice());
        res.setDescription(entity.getDescription());
        res.setStatus(entity.getStatus());
        res.setIsBestSeller(entity.getIsBestSeller());
        res.setImage(entity.getImageUrl());
        res.setBranchesCount(3);
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
