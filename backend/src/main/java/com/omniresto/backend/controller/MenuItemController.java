package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.model.menu.request.MenuItemRequest;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MenuItemController {

    private final MenuItemService menuItemService;

    @GetMapping
    public ResponseEntity<List<MenuItemResponse>> getAllMenuItems() {
        return ResponseEntity.ok(menuItemService.getAllMenuItems());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MenuItemResponse> getMenuItemById(@PathVariable String id) {
        return ResponseEntity.ok(menuItemService.getMenuItemById(id));
    }

    @PostMapping
    public ResponseEntity<MenuItemResponse> createMenuItem(@RequestBody MenuItemRequest request) {
        return ResponseEntity.ok(menuItemService.createMenuItem(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MenuItemResponse> updateMenuItemStatus(
            @PathVariable String id,
            @RequestParam MenuStatus status
    ) {
        return ResponseEntity.ok(menuItemService.updateMenuItemStatus(id, status));
    }
}
