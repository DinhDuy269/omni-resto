package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.model.menu.request.MenuItemCreateRequest;
import com.omniresto.backend.model.menu.request.MenuItemUpdateRequest;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.service.MenuItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService menuItemService;

    /**
     * Lấy danh sách món ăn, hỗ trợ lọc theo buổi: MORNING | NOON | EVENING
     */
    @GetMapping
    public ResponseEntity<List<MenuItemResponse>> getAllMenuItems(
            @RequestParam(required = false) String period
    ) {
        return ResponseEntity.ok(menuItemService.getAllMenuItems(period));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MenuItemResponse> getMenuItemById(@PathVariable String id) {
        return ResponseEntity.ok(menuItemService.getMenuItemById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'store_manager') or permitAll()")
    public ResponseEntity<MenuItemResponse> createMenuItem(@Valid @RequestBody MenuItemCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(menuItemService.createMenuItem(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'store_manager') or permitAll()")
    public ResponseEntity<MenuItemResponse> updateMenuItem(
            @PathVariable String id,
            @Valid @RequestBody MenuItemUpdateRequest request
    ) {
        return ResponseEntity.ok(menuItemService.updateMenuItem(id, request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'store_manager') or permitAll()")
    public ResponseEntity<MenuItemResponse> partialUpdateMenuItem(
            @PathVariable String id,
            @Valid @RequestBody MenuItemUpdateRequest request
    ) {
        return ResponseEntity.ok(menuItemService.updateMenuItem(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('admin', 'store_manager') or permitAll()")
    public ResponseEntity<MenuItemResponse> updateMenuItemStatus(
            @PathVariable String id,
            @RequestParam MenuStatus status
    ) {
        return ResponseEntity.ok(menuItemService.updateMenuItemStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'store_manager') or permitAll()")
    public ResponseEntity<Void> deleteMenuItem(@PathVariable String id) {
        menuItemService.deleteMenuItem(id);
        return ResponseEntity.noContent().build();
    }
}
