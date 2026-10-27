package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MealPeriod;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.helper.MealPeriodHelper;
import com.omniresto.backend.model.menu.request.MenuItemCreateRequest;
import com.omniresto.backend.model.menu.request.MenuItemUpdateRequest;
import com.omniresto.backend.model.menu.response.CategoryOptionResponse;
import com.omniresto.backend.model.menu.response.MealPeriodInfoResponse;
import com.omniresto.backend.model.menu.response.MenuItemResponse;
import com.omniresto.backend.repository.CategoryRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;
    private final CloudStorageService cloudStorageService;
    private final OrderWebSocketHandler orderWebSocketHandler;
    private final ObjectMapper objectMapper;

    public List<MenuItemResponse> getAllMenuItems(String period) {
        List<MenuItemEntity> items;
        if (period != null && !period.isBlank()) {
            items = menuItemRepository.findByMealPeriodsContainingIgnoreCase(period.trim());
        } else {
            items = menuItemRepository.findAll();
        }
        return items.stream()
                .filter(item -> item.getStatus() != MenuStatus.discontinued)
                .map(this::mapToResponse)
                .toList();
    }

    public MenuItemResponse getMenuItemById(String id) {
        return mapToResponse(findMenuItemById(id));
    }

    private MenuItemEntity findMenuItemById(String id) {
        return menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với ID: " + id));
    }

    private void broadcastMenuItemEvent(String eventType, MenuItemResponse response) {
        try {
            if (orderWebSocketHandler != null && response != null) {
                Map<String, Object> message = Map.of(
                        "eventType", eventType,
                        "event_type", eventType,
                        "menuItem", response,
                        "menu_item", response,
                        "itemId", response.getId() != null ? response.getId() : "",
                        "item_id", response.getId() != null ? response.getId() : "",
                        "status", response.getStatus() != null ? response.getStatus().name() : ""
                );
                String json = objectMapper.writeValueAsString(message);
                orderWebSocketHandler.broadcast(json);
                log.info("📢 Broadcasted WebSocket event '{}' for menu item {}", eventType, response.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket event for menu item: {}", e.getMessage());
        }
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
        MenuItemResponse res = mapToResponse(saved);
        broadcastMenuItemEvent("MENU_ITEM_CREATED", res);
        return res;
    }

    @Transactional
    public MenuItemResponse updateMenuItem(String id, MenuItemUpdateRequest request) {
        MenuItemEntity entity = findMenuItemById(id);

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
            String oldImageUrl = entity.getImageUrl();
            String newImageUrl = actual.getEffectiveImageUrl().trim();
            if (oldImageUrl != null && !oldImageUrl.equals(newImageUrl)) {
                String oldPublicId = cloudStorageService.extractPublicId(oldImageUrl);
                String newPublicId = cloudStorageService.extractPublicId(newImageUrl);

                // CHỐNG XÓA NHẦM: Chỉ xóa nếu oldPublicId khác newPublicId (tránh xóa chính ảnh vừa ghi đè)
                if (oldPublicId != null && !oldPublicId.equals(newPublicId)) {
                    // CHỐNG XÓA ẢNH DÙNG CHUNG: Kiểm tra xem còn món ăn nào khác đang sử dụng URL cũ không
                    long otherReferences = menuItemRepository.countByImageUrlAndIdNot(oldImageUrl, entity.getId());
                    if (otherReferences == 0) {
                        try {
                            cloudStorageService.deleteImage(oldPublicId);
                        } catch (Exception e) {
                            log.warn("Không thể xóa ảnh cũ trên Cloudinary: {}", e.getMessage());
                        }
                    } else {
                        log.info("Giữ lại ảnh cũ {} vì còn {} món ăn khác đang sử dụng.", oldPublicId, otherReferences);
                    }
                }
            }
            entity.setImageUrl(newImageUrl);
        }

        if (actual.getCategoryId() != null && !actual.getCategoryId().isBlank()) {
            CategoryEntity category = categoryRepository.findById(actual.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục món ăn với ID: " + actual.getCategoryId()));
            entity.setCategory(category);
        }

        MenuItemEntity updated = menuItemRepository.save(entity);
        MenuItemResponse res = mapToResponse(updated);
        broadcastMenuItemEvent("MENU_ITEM_UPDATED", res);
        return res;
    }

    @Transactional
    public MenuItemResponse updateMenuItemStatus(String id, MenuStatus status) {
        MenuItemEntity entity = findMenuItemById(id);
        entity.setStatus(status);
        MenuItemEntity updated = menuItemRepository.save(entity);
        MenuItemResponse res = mapToResponse(updated);
        broadcastMenuItemEvent("MENU_ITEM_STATUS_CHANGED", res);
        return res;
    }

    @Transactional
    public void deleteMenuItem(String id) {
        MenuItemEntity entity = findMenuItemById(id);
        entity.setStatus(MenuStatus.discontinued);
        MenuItemEntity updated = menuItemRepository.save(entity);
        MenuItemResponse res = mapToResponse(updated);
        broadcastMenuItemEvent("MENU_ITEM_DELETED", res);
        log.info("Đã chuyển món ăn ID {} sang trạng thái ngừng kinh doanh (Soft Delete)", id);
    }

    public MealPeriodInfoResponse getCurrentMealPeriodInfo() {
        LocalTime now = LocalTime.now();
        MealPeriod current = MealPeriodHelper.getCurrentPeriod(now);
        boolean isOrdering = (current != MealPeriod.closed);
        String message;
        switch (current) {
            case morning -> message = "Đang trong khung giờ phục vụ Thực đơn Sáng (06:00 - 10:30)";
            case noon -> message = "Đang trong khung giờ phục vụ Thực đơn Trưa (10:30 - 14:30)";
            case break_time -> message = "Giờ nghỉ bếp dọn dẹp (14:30 - 16:30). Chỉ phục vụ Đồ uống & Cà phê. Ca Tối mở lúc 16:30";
            case evening -> message = "Đang trong khung giờ phục vụ Thực đơn Tối & Lẩu (16:30 - 22:00)";
            default -> message = "Nhà hàng hiện đang đóng cửa (22:00 - 06:00)";
        }
        String currentPeriodStr = (current == MealPeriod.break_time) ? "BREAK" : current.name().toUpperCase();
        return MealPeriodInfoResponse.builder()
                .currentPeriod(currentPeriodStr)
                .periodName(MealPeriodHelper.getDisplayName(current))
                .timeRange(MealPeriodHelper.getTimeRange(current))
                .currentTime(now.format(DateTimeFormatter.ofPattern("HH:mm")))
                .isOrderingAvailable(isOrdering)
                .message(message)
                .build();
    }

    private MenuItemResponse mapToResponse(MenuItemEntity entity) {
        MenuItemResponse res = new MenuItemResponse();
        res.setId(entity.getId());
        res.setCode(entity.getCode());
        res.setName(entity.getName());

        if (entity.getCategory() != null) {
            res.setCategoryId(entity.getCategory().getId());
            res.setCategory(entity.getCategory().getName());
            if (entity.getCategory().getOptions() != null) {
                res.setOptions(entity.getCategory().getOptions().stream()
                        .filter(opt -> "AVAILABLE".equalsIgnoreCase(opt.getStatus()))
                        .map(opt -> CategoryOptionResponse.builder()
                                .id(opt.getId())
                                .categoryId(entity.getCategory().getId())
                                .name(opt.getName())
                                .optionType(opt.getOptionType() != null ? opt.getOptionType().name().toUpperCase() : "TOPPING")
                                .price(opt.getPrice())
                                .status(opt.getStatus())
                                .displayOrder(opt.getDisplayOrder())
                                .build())
                        .toList());
            }
        }

        res.setBasePrice(entity.getBasePrice());
        res.setDescription(entity.getDescription());
        res.setIngredients(entity.getIngredients());
        res.setMealPeriods(entity.getMealPeriods());

        LocalTime now = LocalTime.now();
        boolean availableNow = MealPeriodHelper.isAvailableNow(entity.getMealPeriods(), now);
        res.setIsAvailableNow(availableNow);
        res.setMealPeriodNote(MealPeriodHelper.getPeriodDescription(entity.getMealPeriods()));

        res.setStatus(entity.getStatus());
        res.setIsBestSeller(Boolean.TRUE.equals(entity.getIsBestSeller()));
        res.setImageUrl(entity.getImageUrl());
        res.setCreatedAt(entity.getCreatedAt());
        res.setUpdatedAt(entity.getUpdatedAt());
        return res;
    }
}
