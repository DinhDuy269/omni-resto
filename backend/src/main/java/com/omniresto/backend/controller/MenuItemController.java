package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.MenuItemDto;
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
    public ResponseEntity<List<MenuItemDto>> getAllMenuItems() {
        return ResponseEntity.ok(menuItemService.getAllMasterMenuItems());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MenuItemDto> getMenuItemById(@PathVariable String id) {
        return ResponseEntity.ok(menuItemService.getMenuItemById(id));
    }

    @PostMapping
    public ResponseEntity<MenuItemDto> createMenuItem(@RequestBody MenuItemDto dto) {
        return ResponseEntity.ok(menuItemService.createMenuItem(dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MenuItemDto> updateMenuItemStatus(
            @PathVariable String id,
            @RequestParam MenuStatus status
    ) {
        return ResponseEntity.ok(menuItemService.updateMenuItemStatus(id, status));
    }
}
