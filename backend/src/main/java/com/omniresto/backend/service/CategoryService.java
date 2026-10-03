package com.omniresto.backend.service;

import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.menu.response.CategoryOptionResponse;
import com.omniresto.backend.model.menu.response.CategoryResponse;
import com.omniresto.backend.repository.CategoryOptionRepository;
import com.omniresto.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryOptionRepository categoryOptionRepository;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CategoryResponse getCategoryById(String id) {
        CategoryEntity entity = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        return mapToResponse(entity);
    }

    public List<CategoryOptionResponse> getCategoryOptions(String categoryId) {
        return categoryOptionRepository.findByCategoryIdAndStatusOrderByDisplayOrderAsc(categoryId, "AVAILABLE").stream()
                .map(opt -> CategoryOptionResponse.builder()
                        .id(opt.getId())
                        .categoryId(opt.getCategory() != null ? opt.getCategory().getId() : categoryId)
                        .name(opt.getName())
                        .optionType(opt.getOptionType() != null ? opt.getOptionType().name() : "TOPPING")
                        .price(opt.getPrice())
                        .status(opt.getStatus())
                        .displayOrder(opt.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());
    }

    private CategoryResponse mapToResponse(CategoryEntity entity) {
        List<CategoryOptionResponse> options = null;
        if (entity.getOptions() != null) {
            options = entity.getOptions().stream()
                    .map(opt -> CategoryOptionResponse.builder()
                            .id(opt.getId())
                            .categoryId(entity.getId())
                            .name(opt.getName())
                            .optionType(opt.getOptionType() != null ? opt.getOptionType().name() : "TOPPING")
                            .price(opt.getPrice())
                            .status(opt.getStatus())
                            .displayOrder(opt.getDisplayOrder())
                            .build())
                    .collect(Collectors.toList());
        }

        return CategoryResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .displayOrder(entity.getDisplayOrder())
                .options(options)
                .build();
    }
}
