package com.omniresto.backend.controller;

import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.dto.upload.FileUploadResponse;
import com.omniresto.backend.dto.upload.MigrationItemDetail;
import com.omniresto.backend.dto.upload.MigrationSummaryResponse;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.service.CloudStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final CloudStorageService cloudStorageService;
    private final MenuItemRepository menuItemRepository;

    @Value("${omniresto.security.staff-key:STAFF_SECRET_KEY}")
    private String configuredStaffKey;

    /**
     * Kiểm tra quyền nhân viên/quản trị viên trước khi thực hiện thao tác tải ảnh hoặc đồng bộ.
     * Sử dụng MessageDigest.isEqual (constant-time) để chống tấn công phân tích thời gian (Timing Attack).
     */
    private void checkAdminAccess(String staffKey) {
        if (staffKey == null || staffKey.isBlank() || !isKeyValid(staffKey, configuredStaffKey)) {
            log.warn("🚨 Từ chối quyền truy cập /api/upload do thiếu hoặc sai X-Staff-Key");
            throw new AccessDeniedException("Truy cập bị từ chối: Thao tác tải ảnh và đồng bộ chỉ dành cho Quản trị viên/Nhân sự có thẩm quyền!");
        }
    }

    private boolean isKeyValid(String clientKey, String serverKey) {
        if (clientKey == null || serverKey == null) return false;
        byte[] b1 = clientKey.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] b2 = serverKey.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(b1, b2);
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false, defaultValue = "omniresto/dishes") String folder,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey) {

        checkAdminAccess(staffKey);
        log.info("Received image upload request: name={}, size={} bytes, folder={}",
                file.getOriginalFilename(), file.getSize(), folder);

        FileUploadResponse response = cloudStorageService.uploadImage(file, folder);
        return ResponseEntity.ok(response);
    }

    /**
     * Tự động quét và di chuyển toàn bộ ảnh từ các đường dẫn bên ngoài sang Cloudinary vĩnh viễn.
     * Xử lý từng món độc lập, dùng publicId cố định (dish_{code}) kèm overwrite để chống trùng lặp.
     */
    @PostMapping("/migrate-menu-images")
    public ResponseEntity<MigrationSummaryResponse> migrateMenuImages(
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey) {

        checkAdminAccess(staffKey);
        List<MenuItemEntity> items = menuItemRepository.findAll();

        int successful = 0;
        int skipped = 0;
        int failed = 0;
        List<MigrationItemDetail> details = new ArrayList<>();

        for (MenuItemEntity item : items) {
            String currentUrl = item.getImageUrl();
            String code = item.getCode() != null ? item.getCode() : item.getId();
            String safePublicId = "dish_" + code.toLowerCase().replaceAll("[^a-z0-9_-]", "_");

            // Nếu ảnh đang trỏ tới dịch vụ ngoài (unsplash hoặc http/https ngoài cloudinary)
            boolean isExternalUrl = currentUrl != null && !currentUrl.isBlank()
                    && (currentUrl.contains("unsplash.com") || currentUrl.startsWith("http://") || currentUrl.startsWith("https://"))
                    && !currentUrl.contains("cloudinary.com");

            if (isExternalUrl) {
                try {
                    log.info("Migrating dish image for code: {} from: {}", code, currentUrl);
                    FileUploadResponse res = cloudStorageService.uploadFromUrl(currentUrl, "omniresto/dishes", safePublicId);

                    if (res != null && res.getUrl() != null && !res.getUrl().equals(currentUrl)) {
                        item.setImageUrl(res.getUrl());
                        menuItemRepository.save(item);

                        successful++;
                        details.add(MigrationItemDetail.builder()
                                .id(item.getId())
                                .code(code)
                                .name(item.getName())
                                .originalUrl(currentUrl)
                                .newUrl(res.getUrl())
                                .status("SUCCESS")
                                .build());
                    } else {
                        skipped++;
                        details.add(MigrationItemDetail.builder()
                                .id(item.getId())
                                .code(code)
                                .name(item.getName())
                                .originalUrl(currentUrl)
                                .status("SKIPPED")
                                .build());
                    }
                } catch (Exception e) {
                    log.error("Failed to migrate image for dish {}: {}", code, e.getMessage());
                    failed++;
                    details.add(MigrationItemDetail.builder()
                            .id(item.getId())
                            .code(code)
                            .name(item.getName())
                            .originalUrl(currentUrl)
                            .status("FAILED")
                            .error(e.getMessage())
                            .build());
                }
            } else {
                skipped++;
                details.add(MigrationItemDetail.builder()
                        .id(item.getId())
                        .code(code)
                        .name(item.getName())
                        .originalUrl(currentUrl != null ? currentUrl : "")
                        .status("SKIPPED")
                        .build());
            }
        }

        MigrationSummaryResponse summary = MigrationSummaryResponse.builder()
                .totalProcessed(items.size())
                .successful(successful)
                .failed(failed)
                .skipped(skipped)
                .message(String.format("Đã hoàn tất đồng bộ Cloud! Thành công: %d món, Bỏ qua: %d, Thất bại: %d.",
                        successful, skipped, failed))
                .details(details)
                .build();

        return ResponseEntity.ok(summary);
    }
}
