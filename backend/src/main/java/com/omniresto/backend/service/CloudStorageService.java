package com.omniresto.backend.service;

import com.omniresto.backend.dto.upload.FileUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface CloudStorageService {

    /**
     * Upload an image file to Cloud Object Storage.
     *
     * @param file the multipart file to upload
     * @param folder the target folder (e.g. "dishes", "avatars", "events")
     * @return FileUploadResponse containing secure URL and public ID
     */
    FileUploadResponse uploadImage(MultipartFile file, String folder);

    /**
     * Upload an image directly from a remote URL to Cloud Object Storage (for migrating external links).
     *
     * @param remoteUrl the source image URL
     * @param folder target folder
     * @param customPublicId custom identifier/code
     * @return FileUploadResponse containing secure URL and public ID
     */
    FileUploadResponse uploadFromUrl(String remoteUrl, String folder, String customPublicId);

    /**
     * Delete an asset from Cloud Object Storage by public ID.
     *
     * @param publicId the public ID of the asset
     */
    void deleteImage(String publicId);

    /**
     * Trích xuất publicId từ một Cloudinary URL (nếu có).
     */
    String extractPublicId(String url);

    /**
     * Tạo URL ảnh đã tối ưu hóa (f_auto, q_auto, resize) từ Cloudinary URL gốc.
     */
    String buildOptimizedUrl(String url, int width, int height);

    /**
     * Kiểm tra xem Cloudinary đã được cấu hình hợp lệ hay chưa.
     */
    boolean isCloudStorageConfigured();
}
