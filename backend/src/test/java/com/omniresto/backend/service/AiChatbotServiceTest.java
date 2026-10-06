package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.ai.AiChatRequest;
import com.omniresto.backend.dto.ai.AiChatResponse;
import com.omniresto.backend.repository.MenuItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiChatbotServiceTest {

    @Mock
    private MenuItemRepository menuItemRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AiChatbotService aiChatbotService;

    private List<MenuItemEntity> sampleMenu;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiChatbotService, "wifiSsid", "OmniResto_Test_Guest");
        ReflectionTestUtils.setField(aiChatbotService, "wifiPassword", "TestPass2026");
        ReflectionTestUtils.setField(aiChatbotService, "geminiApiKey", ""); // No gemini key, testing deterministic & rule fallback

        CategoryEntity foodCat = CategoryEntity.builder().name("Món chính").build();
        foodCat.setId("cat-1");

        CategoryEntity drinkCat = CategoryEntity.builder().name("Đồ uống").build();
        drinkCat.setId("cat-2");

        MenuItemEntity pho = MenuItemEntity.builder()
                .code("PHO-01")
                .name("Phở bò tái nạm")
                .category(foodCat)
                .basePrice(new BigDecimal("65000"))
                .status(MenuStatus.available)
                .spicyLevel(0)
                .isVegetarian(false)
                .allergenVerified(false)
                .build();
        pho.setId("dish-pho");

        MenuItemEntity comTam = MenuItemEntity.builder()
                .code("COM-01")
                .name("Cơm tấm sườn nướng")
                .category(foodCat)
                .basePrice(new BigDecimal("55000"))
                .status(MenuStatus.available)
                .spicyLevel(0)
                .isVegetarian(false)
                .allergenVerified(true) // Bếp đã xác nhận không hải sản
                .build();
        comTam.setId("dish-com");

        MenuItemEntity traSen = MenuItemEntity.builder()
                .code("TRA-01")
                .name("Trà sen vàng")
                .category(drinkCat)
                .basePrice(new BigDecimal("30000"))
                .status(MenuStatus.available)
                .spicyLevel(0)
                .build();
        traSen.setId("dish-tra");

        sampleMenu = Arrays.asList(pho, comTam, traSen);
    }

    @Test
    @DisplayName("P0: Phản hồi tuyệt đối không chứa cam kết y tế/pháp lý '100% an toàn' hoặc 'đảm bảo an toàn'")
    void testSafetyInvariantNoAbsoluteSafetyClaims() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        String[] testQueries = {
                "Ngân sách 100k, 1 món mặn + 1 đồ uống, không cay, dị ứng hải sản",
                "Tìm món không cay cho trẻ em",
                "Tôi bị dị ứng hải sản và tôm cua",
                "Món chay thanh đạm"
        };

        for (String query : testQueries) {
            AiChatRequest request = new AiChatRequest();
            request.setMessage(query);

            AiChatResponse response = aiChatbotService.chat(request);
            assertNotNull(response.getReply());

            String reply = response.getReply();
            assertFalse(reply.contains("100% an toàn"), "Phản hồi không được chứa '100% an toàn' với câu hỏi: " + query);
            assertFalse(reply.contains("đảm bảo an toàn"), "Phản hồi không được chứa 'đảm bảo an toàn' với câu hỏi: " + query);
            assertFalse(reply.contains("tuyệt đối không"), "Phản hồi không được chứa 'tuyệt đối không' với câu hỏi: " + query);
        }
    }

    @Test
    @DisplayName("P0: Câu hỏi về dị ứng bắt buộc kèm lời nhắc hỏi nhân viên phục vụ")
    void testAllergyQueriesAlwaysIncludeStaffDisclaimer() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Ngân sách 100k 1 món mặn 1 nước dị ứng hải sản");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().toLowerCase().contains("nhân viên"),
                "Mọi phản hồi về dị ứng phải có lời nhắc hỏi nhân viên phục vụ");
    }

    @Test
    @DisplayName("Phân luồng số học: Ngân sách 100k tính toán chính xác tổng tiền <= 100.000đ")
    void testBudgetArithmeticPrecision() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Ngân sách 100k 1 món mặn + 1 đồ uống không cay");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());
        assertEquals(2, response.getRecommendedDishes().size());

        BigDecimal total = response.getRecommendedDishes().stream()
                .map(d -> d.getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertTrue(total.compareTo(new BigDecimal("100000")) <= 0,
                "Tổng tiền combo gợi ý phải <= ngân sách 100.000đ");
    }

    @Test
    @DisplayName("Cấu hình wifi: Trả về SSID và Password từ cấu hình, không hardcode")
    void testWifiQueryUsesConfiguredValues() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Cho tôi xin mật khẩu wifi quán");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("OmniResto_Test_Guest"));
        assertTrue(response.getReply().contains("TestPass2026"));
    }
}
