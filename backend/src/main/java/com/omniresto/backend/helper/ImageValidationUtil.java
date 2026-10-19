package com.omniresto.backend.helper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
public final class ImageValidationUtil {

    public static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024L; // 5MB

    private static final Pattern SAFE_FOLDER_PATTERN = Pattern.compile("^[a-zA-Z0-9_/-]+$");

    /**
     * Danh sách máy chủ ảnh tin cậy (Strict Domain Allowlist) cho chức năng đồng bộ ảnh thực đơn.
     * Ngăn chặn hoàn toàn việc server kết nối tới các tên miền tùy ý hoặc mạng nội bộ.
     */
    public static final List<String> ALLOWED_IMAGE_DOMAINS = List.of(
            "images.unsplash.com",
            "plus.unsplash.com",
            "res.cloudinary.com",
            "images.pexels.com",
            "cdn.pixabay.com",
            "i.imgur.com"
    );

    private ImageValidationUtil() {}

    public enum ImageType {
        JPEG(".jpg"),
        PNG(".png"),
        WEBP(".webp"),
        GIF(".gif");

        private final String extension;

        ImageType(String extension) {
            this.extension = extension;
        }

        public String getExtension() {
            return extension;
        }
    }

    /**
     * Kiểm tra tính hợp lệ và đọc Magic Bytes của file ảnh.
     */
    public static ImageType validateAndDetectType(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tải lên không được để trống!");
        }

        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException(String.format("Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 5MB, file hiện tại: %.2fMB)",
                    file.getSize() / (1024.0 * 1024.0)));
        }

        byte[] header = new byte[12];
        int bytesRead;
        try (InputStream is = file.getInputStream()) {
            bytesRead = is.read(header);
        } catch (IOException e) {
            throw new IllegalArgumentException("Không thể đọc nội dung file: " + e.getMessage(), e);
        }

        if (bytesRead < 12) {
            throw new IllegalArgumentException("File quá nhỏ hoặc không phải định dạng hình ảnh hợp lệ!");
        }

        // JPEG Magic Bytes: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return ImageType.JPEG;
        }

        // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
        if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
            (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47 &&
            (header[4] & 0xFF) == 0x0D && (header[5] & 0xFF) == 0x0A &&
            (header[6] & 0xFF) == 0x1A && (header[7] & 0xFF) == 0x0A) {
            return ImageType.PNG;
        }

        // WebP Magic Bytes: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
            header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return ImageType.WEBP;
        }

        // GIF Magic Bytes: GIF8
        if (header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8') {
            return ImageType.GIF;
        }

        throw new IllegalArgumentException("Định dạng file không được hỗ trợ! Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF (được xác thực qua Magic Bytes).");
    }

    /**
     * Làm sạch và kiểm tra tên thư mục để ngăn chặn Path Traversal (../ hoặc ký tự nguy hiểm).
     */
    public static String sanitizeFolderName(String folder, String defaultFolder) {
        if (folder == null || folder.isBlank()) {
            return defaultFolder;
        }
        String clean = folder.trim().replace('\\', '/');
        // Loại bỏ slash ở đầu và cuối
        while (clean.startsWith("/")) clean = clean.substring(1);
        while (clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);

        if (clean.contains("..") || !SAFE_FOLDER_PATTERN.matcher(clean).matches()) {
            throw new IllegalArgumentException("Tên thư mục chứa ký tự không hợp lệ hoặc có dấu hiệu Path Traversal!");
        }
        return clean;
    }

    /**
     * Kiểm tra URL an toàn chống tấn công SSRF (Server-Side Request Forgery).
     * Áp dụng:
     * 1. Giao thức HTTPS nghiêm ngặt
     * 2. Danh sách trắng Domain máy chủ ảnh cho phép (Domain Allowlist)
     * 3. Phân giải TẤT CẢ các địa chỉ IP của Hostname và kiểm tra Private/Loopback/Metadata IP
     */
    public static void validateRemoteImageUrl(String remoteUrl) {
        if (remoteUrl == null || remoteUrl.isBlank()) {
            throw new IllegalArgumentException("Remote URL không được để trống!");
        }

        URI uri;
        try {
            uri = URI.create(remoteUrl.trim());
        } catch (Exception e) {
            throw new IllegalArgumentException("Định dạng URL không hợp lệ: " + e.getMessage());
        }

        // 1. Chỉ chấp nhận giao thức HTTPS an toàn
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("Chỉ chấp nhận giao thức HTTPS an toàn cho đường dẫn ảnh bên ngoài!");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL không chứa thông tin máy chủ (Host) hợp lệ!");
        }

        String lowerHost = host.toLowerCase().trim();

        // 2. Chặn các host nội bộ trực tiếp
        if (lowerHost.equals("localhost") || lowerHost.endsWith(".localhost") ||
            lowerHost.endsWith(".local") || lowerHost.endsWith(".internal")) {
            throw new SecurityException("Không được phép tải ảnh từ mạng nội bộ (SSRF Protection)!");
        }

        // 3. Domain Allowlist: Chỉ cho phép các domain CDN ảnh uy tín
        boolean isAllowedDomain = ALLOWED_IMAGE_DOMAINS.stream()
                .anyMatch(domain -> lowerHost.equals(domain) || lowerHost.endsWith("." + domain));

        if (!isAllowedDomain) {
            throw new SecurityException(String.format(
                    "Máy chủ '%s' không nằm trong danh sách nhà cung cấp ảnh tin cậy (Allowlist: unsplash, cloudinary, pexels, pixabay, imgur)!",
                    host
            ));
        }

        // 4. Phân giải DNS và kiểm tra TẤT CẢ các IP trả về
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses == null || addresses.length == 0) {
                throw new IllegalArgumentException("Không thể phân giải địa chỉ IP cho máy chủ ảnh: " + host);
            }

            for (InetAddress address : addresses) {
                if (address.isLoopbackAddress() || address.isSiteLocalAddress() ||
                    address.isLinkLocalAddress() || address.isAnyLocalAddress() ||
                    address.isMulticastAddress()) {
                    throw new SecurityException("Địa chỉ IP máy chủ đích (" + address.getHostAddress() + ") thuộc mạng nội bộ hoặc dải bị cấm (SSRF Protection)!");
                }

                // Chặn dải Cloud Metadata (AWS/GCP/Azure/OpenStack: 169.254.x.x)
                byte[] ipBytes = address.getAddress();
                if (ipBytes.length == 4) {
                    int b0 = ipBytes[0] & 0xFF;
                    int b1 = ipBytes[1] & 0xFF;
                    if (b0 == 169 && b1 == 254) {
                        throw new SecurityException("Không được phép truy cập dải địa chỉ Cloud Metadata (169.254.x.x)!");
                    }
                }
            }
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Lỗi phân giải DNS khi kiểm tra SSRF cho host: {}", host);
            throw new IllegalArgumentException("Không thể kết nối hoặc phân giải máy chủ ảnh: " + host);
        }
    }
}
