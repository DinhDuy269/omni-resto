package com.omniresto.backend.controller;

import com.omniresto.backend.model.menu.response.CategoryOptionResponse;
import com.omniresto.backend.model.menu.response.CategoryResponse;
import com.omniresto.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable String id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @GetMapping("/{id}/options")
    public ResponseEntity<List<CategoryOptionResponse>> getCategoryOptions(@PathVariable String id) {
        return ResponseEntity.ok(categoryService.getCategoryOptions(id));
    }
}
