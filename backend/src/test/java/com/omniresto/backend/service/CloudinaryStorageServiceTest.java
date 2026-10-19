package com.omniresto.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CloudinaryStorageServiceTest {

    private CloudinaryStorageService storageService;
    private static final String CONFIGURED_CLOUD_NAME = "testcloud";

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectProvider provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);

        storageService = new CloudinaryStorageService(provider);
        ReflectionTestUtils.setField(storageService, "cloudName", CONFIGURED_CLOUD_NAME);
    }

    @Test
    @DisplayName("Should extract publicId correctly from valid Cloudinary URL with version and folder")
    void shouldExtractPublicIdWithVersion() {
        String url = "https://res.cloudinary.com/testcloud/image/upload/v1712345678/omniresto/dishes/dish_m01.jpg";
        String publicId = storageService.extractPublicId(url);

        assertEquals("omniresto/dishes/dish_m01", publicId);
    }

    @Test
    @DisplayName("Should extract publicId correctly when URL has transformation parameters and version")
    void shouldExtractPublicIdWithTransformsAndVersion() {
        String url = "https://res.cloudinary.com/testcloud/image/upload/f_auto,q_auto,w_400/v1712345678/omniresto/dishes/dish_m01.webp";
        String publicId = storageService.extractPublicId(url);

        assertEquals("omniresto/dishes/dish_m01", publicId);
    }

    @Test
    @DisplayName("Should return null if image belongs to a different Cloudinary account (prevent deleting foreign assets)")
    void shouldReturnNullForForeignCloudAccount() {
        String url = "https://res.cloudinary.com/other_account/image/upload/v1/omniresto/dishes/dish_m01.jpg";
        String publicId = storageService.extractPublicId(url);

        assertNull(publicId);
    }

    @Test
    @DisplayName("Should return null for non-Cloudinary external URLs (e.g. Unsplash, Pexels)")
    void shouldReturnNullForExternalUrls() {
        assertNull(storageService.extractPublicId("https://images.unsplash.com/photo-1546069901-ba9599a7e63c"));
        assertNull(storageService.extractPublicId("https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"));
        assertNull(storageService.extractPublicId(null));
        assertNull(storageService.extractPublicId(""));
    }

    @Test
    @DisplayName("Should insert transformation parameters into Cloudinary URL")
    void shouldBuildOptimizedUrl() {
        String raw = "https://res.cloudinary.com/testcloud/image/upload/v1/omniresto/dishes/dish_01.jpg";
        String optimized = storageService.buildOptimizedUrl(raw, 400, 400);

        assertEquals("https://res.cloudinary.com/testcloud/image/upload/f_auto,q_auto,w_400,h_400,c_fill/v1/omniresto/dishes/dish_01.jpg", optimized);
    }

    @Test
    @DisplayName("Should not modify non-Cloudinary URL in buildOptimizedUrl")
    void shouldNotModifyExternalUrlInBuildOptimizedUrl() {
        String external = "https://images.unsplash.com/photo-1234";
        assertEquals(external, storageService.buildOptimizedUrl(external, 400, 400));
    }
}
