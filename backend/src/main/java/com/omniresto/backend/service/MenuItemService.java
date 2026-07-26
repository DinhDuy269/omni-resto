package com.omniresto.backend.service;

import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.MenuItemDto;
import com.omniresto.backend.repository.CategoryRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    public List<MenuItemDto> getAllMasterMenuItems() {
        return menuItemRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public MenuItemDto getMenuItemById(String id) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found with id: " + id));
        return mapToDto(entity);
    }

    public MenuItemDto createMenuItem(MenuItemDto dto) {
        CategoryEntity category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId()).orElse(null);
        }

        MenuItemEntity entity = MenuItemEntity.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .category(category)
                .basePrice(dto.getBasePrice())
                .description(dto.getDescription())
                .status(dto.getStatus() != null ? dto.getStatus() : MenuStatus.available)
                .isBestSeller(dto.getIsBestSeller() != null ? dto.getIsBestSeller() : false)
                .imageUrl(dto.getImageUrl())
                .build();

        return mapToDto(menuItemRepository.save(entity));
    }

    public MenuItemDto updateMenuItemStatus(String id, MenuStatus status) {
        MenuItemEntity entity = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found with id: " + id));
        entity.setStatus(status);
        return mapToDto(menuItemRepository.save(entity));
    }

    private MenuItemDto mapToDto(MenuItemEntity entity) {
        return MenuItemDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : "Khác")
                .basePrice(entity.getBasePrice())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .isBestSeller(entity.getIsBestSeller())
                .imageUrl(entity.getImageUrl())
                .build();
    }
}
