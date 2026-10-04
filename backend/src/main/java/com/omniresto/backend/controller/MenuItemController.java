package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.model.menu.request.MenuItemCreateRequest;
import com.omniresto.backend.model.menu.request.MenuItemUpdateRequest;
import com.omniresto.backend.model.menu.response.MealPeriodInfoResponse;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.service.MenuItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    public List<MenuItemResponse> getAllMenuItems(@RequestParam(required = false) String period) {
        return menuItemService.getAllMenuItems(period);
    }

    @GetMapping("/current-period")
    public MealPeriodInfoResponse getCurrentMealPeriod() {
        return menuItemService.getCurrentMealPeriodInfo();
    }

    @GetMapping("/{id}")
    public MenuItemResponse getMenuItemById(@PathVariable String id) {
        return menuItemService.getMenuItemById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItemResponse createMenuItem(@Valid @RequestBody MenuItemCreateRequest request) {
        return menuItemService.createMenuItem(request);
    }

    @PutMapping("/{id}")
    public MenuItemResponse updateMenuItem(
            @PathVariable String id,
            @Valid @RequestBody MenuItemUpdateRequest request
    ) {
        return menuItemService.updateMenuItem(id, request);
    }

    @PatchMapping("/{id}")
    public MenuItemResponse partialUpdateMenuItem(
            @PathVariable String id,
            @Valid @RequestBody MenuItemUpdateRequest request
    ) {
        return menuItemService.updateMenuItem(id, request);
    }

    @PatchMapping("/{id}/status")
    public MenuItemResponse updateMenuItemStatus(
            @PathVariable String id,
            @RequestParam MenuStatus status
    ) {
        return menuItemService.updateMenuItemStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMenuItem(@PathVariable String id) {
        menuItemService.deleteMenuItem(id);
    }
}
