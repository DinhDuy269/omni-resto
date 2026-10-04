package com.omniresto.backend.controller;

import com.omniresto.backend.model.menu.response.CategoryOptionResponse;
import com.omniresto.backend.model.menu.response.CategoryResponse;
import com.omniresto.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public List<CategoryResponse> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/{id}")
    public CategoryResponse getCategoryById(@PathVariable String id) {
        return categoryService.getCategoryById(id);
    }

    @GetMapping("/{id}/options")
    public List<CategoryOptionResponse> getCategoryOptions(@PathVariable String id) {
        return categoryService.getCategoryOptions(id);
    }
}
