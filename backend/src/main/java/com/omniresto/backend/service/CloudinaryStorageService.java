package com.omniresto.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.omniresto.backend.dto.upload.FileUploadResponse;
import com.omniresto.backend.helper.ImageValidationUtil;
import com.omniresto.backend.helper.ImageValidationUtil.ImageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Slf4j
public class CloudinaryStorageService implements CloudStorageService {

    private final Cloudinary cloudinary;
    private final boolean isCloudConfigured;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.folder:omniresto/dishes}")
    private String defaultFolder;

    @Value("${cloudinary.fallback-to-local.enabled:false}")
    private boolean fallbackToLocalEnabled;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    private static final Pattern SAFE_PUBLIC_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9_/-]+$");

    public CloudinaryStorageService(ObjectProvider<Cloudinary> cloudinaryProvider) {
        this.cloudinary = cloudinaryProvider.getIfAvailable();
        this.isCloudConfigured = (this.cloudinary != null);
        if (this.isCloudConfigured) {
            log.info("☁️ [CloudinaryStorageService] Sẵn sàng hoạt động với Cloudinary Object Storage.");
        } else {
            log.warn("⚠️ [CloudinaryStorageService] Cloudinary chưa được cấu hình. Chỉ cho phép lưu trữ cục bộ trên môi trường Dev.");
        }
    }

    @Override
    public boolean isCloudStorageConfigured() {
        return this.isCloudConfigured && this.cloudinary != null;
    }

    private boolean isDevOrTestProfile() {
        if (activeProfile == null) return false;
        String p = activeProfile.toLowerCase().trim();
        return p.contains("dev") || p.contains("test");
    }

    @Override
    public FileUploadResponse uploadImage(MultipartFile file, String folder) {
        // 1. Kiểm tra kích thước và Magic Bytes định dạng ảnh
        ImageType imageType = ImageValidationUtil.validateAndDetectType(file);

        // 2. Làm sạch tên thư mục chống Path Traversal
        String targetFolder = ImageValidationUtil.sanitizeFolderName(folder, defaultFolder);

        // 3. Nếu Cloudinary đã được cấu hình: Tải trực tiếp lên Cloud
        if (isCloudStorageConfigured()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                        "folder", targetFolder,
                        "resource_type", "image",
                        "overwrite", true
                ));

                String secureUrl = (String) uploadResult.get("secure_url");
                String publicId = (String) uploadResult.get("public_id");
                String format = (String) uploadResult.get("format");
                Number bytes = (Number) uploadResult.get("bytes");

                log.info("✅ Image uploaded to Cloudinary: publicId={}, url={}", publicId, secureUrl);
                return FileUploadResponse.builder()
                        .url(secureUrl)
                        .publicId(publicId)
                        .format(format != null ? format : imageType.getExtension().replace(".", ""))
                        .bytes(bytes != null ? bytes.longValue() : file.getSize())
                        .originalFilename(file.getOriginalFilename())
                        .storageProvider("CLOUDINARY")
                        .message("Tải ảnh lên Cloudinary thành công")
                        .build();
            } catch (Exception e) {
                log.error("Cloudinary upload error: {}. Kiểm tra chế độ fallback.", e.getMessage());
                if (!fallbackToLocalEnabled || !isDevOrTestProfile()) {
                    throw new RuntimeException("Lỗi tải ảnh lên Cloudinary: " + e.getMessage(), e);
                }
            }
        }

        // 4. Kiểm tra chế độ Fallback: Bắt buộc fail-fast trên Production nếu thiếu key
        if (!fallbackToLocalEnabled || !isDevOrTestProfile()) {
            throw new IllegalStateException("Cloudinary chưa được cấu hình! Trên môi trường Production, bắt buộc phải thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
        }

        log.warn("⚠️ [DEV FALLBACK] Đang lưu ảnh vào thư mục cục bộ (uploads/) vì Cloudinary chưa được cấu hình.");
        return saveToLocalStorage(file, targetFolder, imageType);
    }

    @Override
    public FileUploadResponse uploadFromUrl(String remoteUrl, String folder, String customPublicId) {
        // 1. Phòng chống SSRF: HTTPS, Domain Allowlist, kiểm tra tất cả DNS IPs
        ImageValidationUtil.validateRemoteImageUrl(remoteUrl);

        // 2. Làm sạch folder và customPublicId
        String targetFolder = ImageValidationUtil.sanitizeFolderName(folder, defaultFolder);
        String safePublicId = null;
        if (customPublicId != null && !customPublicId.isBlank()) {
            String sanitized = customPublicId.trim().replace('\\', '_').replace('/', '_');
            if (SAFE_PUBLIC_ID_PATTERN.matcher(sanitized).matches()) {
                safePublicId = sanitized;
            }
        }

        // 3. Tải lên Cloudinary
        if (isCloudStorageConfigured()) {
            try {
                Map<String, Object> params = ObjectUtils.asMap(
                        "folder", targetFolder,
                        "resource_type", "image",
                        "overwrite", true
                );
                if (safePublicId != null) {
                    params.put("public_id", safePublicId);
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(remoteUrl.trim(), params);

                String secureUrl = (String) uploadResult.get("secure_url");
                String publicId = (String) uploadResult.get("public_id");
                String format = (String) uploadResult.get("format");
                Number bytes = (Number) uploadResult.get("bytes");

                log.info("✅ Migrated remote URL to Cloudinary: {} -> {}", remoteUrl, secureUrl);
                return FileUploadResponse.builder()
                        .url(secureUrl)
                        .publicId(publicId)
                        .format(format)
                        .bytes(bytes != null ? bytes.longValue() : 0L)
                        .originalFilename(remoteUrl)
                        .storageProvider("CLOUDINARY")
                        .message("Chuyển đổi sang Cloudinary thành công")
                        .build();
            } catch (Exception e) {
                log.error("Failed to migrate remote URL to Cloudinary: {}", e.getMessage());
                throw new RuntimeException("Không thể chuyển đổi URL sang Cloudinary: " + e.getMessage(), e);
            }
        }

        if (!isDevOrTestProfile()) {
            throw new IllegalStateException("Tính năng migrate ảnh yêu cầu Cloudinary phải được kích hoạt trên Production!");
        }

        return FileUploadResponse.builder()
                .url(remoteUrl)
                .originalFilename(remoteUrl)
                .storageProvider("EXTERNAL_FALLBACK")
                .message("Giữ nguyên URL gốc (Cloudinary chưa được cấu hình)")
                .build();
    }

    @Override
    public void deleteImage(String publicId) {
        if (publicId == null || publicId.trim().isEmpty()) return;

        if (isCloudStorageConfigured()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = cloudinary.uploader().destroy(publicId.trim(), ObjectUtils.emptyMap());
                log.info("🗑️ Deleted asset from Cloudinary: publicId={}, result={}", publicId, result.get("result"));
            } catch (Exception e) {
                log.warn("Failed to delete asset from Cloudinary: publicId={}, error={}", publicId, e.getMessage());
            }
        }
    }

    @Override
    public String extractPublicId(String url) {
        if (url == null || url.isBlank() || cloudName == null || cloudName.isBlank()) {
            return null;
        }

        String cleanUrl = url.trim();
        // Chỉ xử lý các URL thuộc đúng Cloudinary cloud_name của quán
        String expectedPrefix = "res.cloudinary.com/" + cloudName.trim() + "/image/upload/";
        int prefixIndex = cleanUrl.indexOf(expectedPrefix);
        if (prefixIndex == -1) {
            return null;
        }

        try {
            String afterUpload = cleanUrl.substring(prefixIndex + expectedPrefix.length());
            String[] segments = afterUpload.split("/");
            StringBuilder sb = new StringBuilder();
            boolean passedTransformsOrVersion = false;

            for (String segment : segments) {
                // Bỏ qua các transformation (f_auto,q_auto,w_400) và version (v1712345678)
                if (!passedTransformsOrVersion) {
                    if (segment.matches("v\\d+") || segment.contains(",") ||
                        segment.startsWith("w_") || segment.startsWith("h_") ||
                        segment.startsWith("c_") || segment.startsWith("f_") || segment.startsWith("q_")) {
                        continue;
                    }
                }
                passedTransformsOrVersion = true;
                if (sb.length() > 0) sb.append("/");
                sb.append(segment);
            }

            String full = sb.toString();
            int dot = full.lastIndexOf(".");
            if (dot != -1) {
                full = full.substring(0, dot);
            }
            return full.isEmpty() ? null : full;
        } catch (Exception e) {
            log.warn("Không thể trích xuất publicId từ URL: {}", url);
            return null;
        }
    }

    @Override
    public String buildOptimizedUrl(String url, int width, int height) {
        if (url == null || !url.contains("cloudinary.com") || !url.contains("/upload/")) {
            return url;
        }
        StringBuilder transform = new StringBuilder("f_auto,q_auto");
        if (width > 0) transform.append(",w_").append(width);
        if (height > 0) transform.append(",h_").append(height);
        if (width > 0 || height > 0) transform.append(",c_fill");

        return url.replace("/upload/", "/upload/" + transform + "/");
    }

    private FileUploadResponse saveToLocalStorage(MultipartFile file, String folder, ImageType imageType) {
        try {
            Path baseUploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            Path uploadDir = baseUploadDir.resolve(folder.replace('/', File.separatorChar)).normalize();

            // Kiểm tra Path Traversal nghiêm ngặt với Path.startsWith
            if (!uploadDir.startsWith(baseUploadDir)) {
                throw new SecurityException("Phát hiện nguy cơ Path Traversal trong đường dẫn lưu trữ!");
            }

            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // Tên file hoàn toàn do Server sinh bằng UUID + extension lấy từ Magic Bytes
            String newFilename = UUID.randomUUID().toString() + imageType.getExtension();
            Path destination = uploadDir.resolve(newFilename).normalize();

            if (!destination.startsWith(uploadDir)) {
                throw new SecurityException("Đường dẫn lưu file không an toàn!");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            String localUrl = "/uploads/" + folder.replace('\\', '/') + "/" + newFilename;

            log.info("💾 Saved file to local storage: {}", destination);
            return FileUploadResponse.builder()
                    .url(localUrl)
                    .publicId(newFilename)
                    .format(imageType.getExtension().replace(".", ""))
                    .bytes(file.getSize())
                    .originalFilename(file.getOriginalFilename())
                    .storageProvider("LOCAL_FALLBACK")
                    .message("Lưu trữ cục bộ thành công (Chế độ Dev Fallback)")
                    .build();
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu trữ file cục bộ: " + e.getMessage(), e);
        }
    }
}
