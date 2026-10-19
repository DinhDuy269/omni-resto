package com.omniresto.backend.controller;

import com.omniresto.backend.dto.upload.FileUploadResponse;
import com.omniresto.backend.dto.upload.MigrationSummaryResponse;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.service.CloudStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FileUploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CloudStorageService cloudStorageService;

    @MockBean
    private MenuItemRepository menuItemRepository;

    private static final String VALID_STAFF_KEY = "STAFF_SECRET_KEY";

    @Test
    @DisplayName("Should reject upload when X-Staff-Key header is missing")
    void shouldRejectUploadWithoutStaffKey() throws Exception {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpegBytes);

        mockMvc.perform(multipart("/api/upload/image").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject upload when X-Staff-Key header is invalid")
    void shouldRejectUploadWithInvalidStaffKey() throws Exception {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpegBytes);

        mockMvc.perform(multipart("/api/upload/image")
                        .file(file)
                        .header("X-Staff-Key", "WRONG_KEY"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should succeed upload when X-Staff-Key header is valid and file is valid JPG")
    void shouldSucceedUploadWithValidKeyAndFile() throws Exception {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile("file", "dish.jpg", "image/jpeg", jpegBytes);

        FileUploadResponse mockResponse = FileUploadResponse.builder()
                .url("https://res.cloudinary.com/testcloud/image/upload/omniresto/dishes/dish_01.jpg")
                .publicId("omniresto/dishes/dish_01")
                .format("jpg")
                .storageProvider("CLOUDINARY")
                .message("Tải ảnh lên Cloudinary thành công")
                .build();

        when(cloudStorageService.uploadImage(any(), anyString())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/api/upload/image")
                        .file(file)
                        .header("X-Staff-Key", VALID_STAFF_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://res.cloudinary.com/testcloud/image/upload/omniresto/dishes/dish_01.jpg"))
                .andExpect(jsonPath("$.public_id").value("omniresto/dishes/dish_01"))
                .andExpect(jsonPath("$.storage_provider").value("CLOUDINARY"));
    }

    @Test
    @DisplayName("Should reject migrate request when X-Staff-Key is missing")
    void shouldRejectMigrateWithoutStaffKey() throws Exception {
        mockMvc.perform(post("/api/upload/migrate-menu-images"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should succeed migrate request when X-Staff-Key is valid")
    void shouldSucceedMigrateWithValidStaffKey() throws Exception {
        when(menuItemRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(post("/api/upload/migrate-menu-images")
                        .header("X-Staff-Key", VALID_STAFF_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_processed").value(0))
                .andExpect(jsonPath("$.successful").value(0))
                .andExpect(jsonPath("$.failed").value(0))
                .andExpect(jsonPath("$.skipped").value(0));
    }
}
