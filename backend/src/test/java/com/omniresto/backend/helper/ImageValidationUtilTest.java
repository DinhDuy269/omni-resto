package com.omniresto.backend.helper;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class ImageValidationUtilTest {

    @Test
    @DisplayName("Should detect valid JPEG magic bytes")
    void shouldDetectValidJpeg() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpegBytes);

        ImageValidationUtil.ImageType type = ImageValidationUtil.validateAndDetectType(file);
        assertEquals(ImageValidationUtil.ImageType.JPEG, type);
        assertEquals(".jpg", type.getExtension());
    }

    @Test
    @DisplayName("Should detect valid PNG magic bytes")
    void shouldDetectValidPng() {
        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D};
        MockMultipartFile file = new MockMultipartFile("file", "dish.png", "image/png", pngBytes);

        ImageValidationUtil.ImageType type = ImageValidationUtil.validateAndDetectType(file);
        assertEquals(ImageValidationUtil.ImageType.PNG, type);
        assertEquals(".png", type.getExtension());
    }

    @Test
    @DisplayName("Should detect valid WebP magic bytes")
    void shouldDetectValidWebp() {
        byte[] webpBytes = new byte[]{
                'R', 'I', 'F', 'F',
                0x00, 0x00, 0x00, 0x00,
                'W', 'E', 'B', 'P'
        };
        MockMultipartFile file = new MockMultipartFile("file", "dish.webp", "image/webp", webpBytes);

        ImageValidationUtil.ImageType type = ImageValidationUtil.validateAndDetectType(file);
        assertEquals(ImageValidationUtil.ImageType.WEBP, type);
        assertEquals(".webp", type.getExtension());
    }

    @Test
    @DisplayName("Should reject fake image disguised as JPG (e.g. text or script)")
    void shouldRejectFakeImage() {
        byte[] fakeBytes = "<?php echo 'malicious'; ?>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "exploit.jpg", "image/jpeg", fakeBytes);

        assertThrows(IllegalArgumentException.class, () -> ImageValidationUtil.validateAndDetectType(file));
    }

    @Test
    @DisplayName("Should reject file exceeding 5MB")
    void shouldRejectOversizedFile() {
        byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile file = new MockMultipartFile("file", "huge.jpg", "image/jpeg", largeBytes);

        assertThrows(IllegalArgumentException.class, () -> ImageValidationUtil.validateAndDetectType(file));
    }

    @Test
    @DisplayName("Should sanitize folder and reject Path Traversal")
    void shouldSanitizeFolderAndRejectPathTraversal() {
        assertEquals("omniresto/dishes", ImageValidationUtil.sanitizeFolderName("omniresto/dishes", "default"));
        assertEquals("dishes", ImageValidationUtil.sanitizeFolderName("/dishes/", "default"));

        // Reject directory traversal
        assertThrows(IllegalArgumentException.class, () -> ImageValidationUtil.sanitizeFolderName("../../etc/passwd", "default"));
        assertThrows(IllegalArgumentException.class, () -> ImageValidationUtil.sanitizeFolderName("dishes/../secret", "default"));
    }

    @Test
    @DisplayName("Should reject non-HTTPS URLs, unallowed domains, and private IPs in SSRF validation")
    void shouldRejectInsecureUrlsAndPrivateIps() {
        // Non-HTTPS
        assertThrows(IllegalArgumentException.class, () -> ImageValidationUtil.validateRemoteImageUrl("http://images.unsplash.com/dish.jpg"));

        // Domain not in allowlist
        assertThrows(SecurityException.class, () -> ImageValidationUtil.validateRemoteImageUrl("https://attacker-server.com/malicious.jpg"));

        // Localhost
        assertThrows(SecurityException.class, () -> ImageValidationUtil.validateRemoteImageUrl("https://localhost/dish.jpg"));
        assertThrows(SecurityException.class, () -> ImageValidationUtil.validateRemoteImageUrl("https://127.0.0.1/dish.jpg"));
    }

    @Test
    @DisplayName("Should accept valid HTTPS URL from allowed trusted image provider")
    void shouldAcceptTrustedDomainUrl() {
        assertDoesNotThrow(() -> ImageValidationUtil.validateRemoteImageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c"));
    }
}
