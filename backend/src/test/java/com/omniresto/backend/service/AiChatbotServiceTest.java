package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.domain.CategoryEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.ai.AiChatRequest;
import com.omniresto.backend.dto.ai.AiChatResponse;
import com.omniresto.backend.dto.ai.ChatMessageDto;
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
import java.util.ArrayList;
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
        ReflectionTestUtils.setField(aiChatbotService, "clock", java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T05:00:00Z"), java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        aiChatbotService.clearCache();

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

        MenuItemEntity lauThai = MenuItemEntity.builder()
                .code("LAU-01")
                .name("Set Lẩu Thái Hải Sản Tomyum Cốt Dừa")
                .description("Nước lẩu Tomyum cốt dừa thơm nức ngập tràn tôm mực tươi sống.")
                .category(foodCat)
                .basePrice(new BigDecimal("359000"))
                .status(MenuStatus.available)
                .spicyLevel(2)
                .allergens("Hải sản (tôm, mực)")
                .build();
        lauThai.setId("dish-lau-thai");

        MenuItemEntity lauGa = MenuItemEntity.builder()
                .code("LAU-02")
                .name("Lẩu Gà Đồi Nấu Lá É Phú Yên")
                .description("Gà ta thả đồi chắc thịt nấu cùng măng củ giòn ngọt và lá é tươi.")
                .category(foodCat)
                .basePrice(new BigDecimal("289000"))
                .status(MenuStatus.available)
                .spicyLevel(0)
                .allergens("Không có")
                .build();
        lauGa.setId("dish-lau-ga");

        sampleMenu = Arrays.asList(pho, comTam, traSen, lauThai, lauGa);
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

    @Test
    @DisplayName("Nghiệp vụ Dị ứng: Khi khách báo dị ứng gà và hải sản, hệ thống loại bỏ 100% món gà và hải sản")
    void testAllergyQueryChickenAndSeafoodExclusion() {
        CategoryEntity foodCat = CategoryEntity.builder().name("Món chính").build();
        foodCat.setId("cat-1");

        MenuItemEntity phoGa = MenuItemEntity.builder()
                .code("PHO-02")
                .name("Phở Gà Đồi Chặt Lá Chanh")
                .category(foodCat)
                .basePrice(new BigDecimal("69000"))
                .status(MenuStatus.available)
                .isVegetarian(false)
                .build();
        phoGa.setId("dish-ga");

        MenuItemEntity bunCua = MenuItemEntity.builder()
                .code("BUN-01")
                .name("Bún Bò Huế Chả Cua Giò Heo")
                .category(foodCat)
                .basePrice(new BigDecimal("79000"))
                .status(MenuStatus.available)
                .allergens("Động vật giáp xác, Cua")
                .isVegetarian(false)
                .build();
        bunCua.setId("dish-cua");

        MenuItemEntity phoBo = MenuItemEntity.builder()
                .code("PHO-01")
                .name("Phở Bò Tái Nạm Wagyu")
                .category(foodCat)
                .basePrice(new BigDecimal("89000"))
                .status(MenuStatus.available)
                .isVegetarian(false)
                .build();
        phoBo.setId("dish-bo");

        List<MenuItemEntity> testMenu = Arrays.asList(phoGa, bunCua, phoBo);
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(testMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Tôi bị dị ứng gà , hải sản");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());
        assertTrue(response.getReply().contains("thịt gà"));
        assertTrue(response.getReply().contains("hải sản"));

        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải gợi ý món an toàn thay thế");
        for (var dish : response.getRecommendedDishes()) {
            String nameLower = dish.getName().toLowerCase();
            assertFalse(nameLower.contains("gà"), "Tuyệt đối không được chứa món gà: " + dish.getName());
            assertFalse(nameLower.contains("cua"), "Tuyệt đối không được chứa cua: " + dish.getName());
            assertFalse(nameLower.contains("hải sản"), "Tuyệt đối không được chứa hải sản: " + dish.getName());
        }
    }

    @Test
    @DisplayName("Nghiệp vụ Bàn 2 người: Gợi ý thực đơn cân đối riêng cho 2 người")
    void testTwoPeopleMealRecommendation() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Tôi đi 2 người thì ăn món gì cho phù hợp");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());
        assertTrue(response.getReply().contains("2 người") || response.getReply().contains("2 quý khách"));
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải có món gợi ý cho 2 người");
    }

    @Test
    @DisplayName("P0: Xử lý trọn vẹn câu hỏi đa ý định (Hẹn hò + Dị ứng gà, hải sản + Ngân sách 2 triệu + Voucher + Thanh toán)")
    void testComplexMultiIntentDateAllergyQuery() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Tôi đi hẹn hò với 1 người nữa, tôi muốn món ăn nào đó ấm cúng và phải ngon, giá trị tối đa là 2 triệu, và tôi bị dị ứng với hải sản, thịt gà, quán có voucher giảm giá nào không và thanh toán bằng phương thức gì");

        AiChatResponse response = aiChatbotService.chat(request);
        System.out.println("=== TEST RESPONSE ===");
        System.out.println("MODEL: " + response.getModelUsed());
        System.out.println("REPLY:\n" + response.getReply());
        System.out.println("DISHES: " + response.getRecommendedDishes().size());

        assertNotNull(response.getReply());
        // Phải ghi nhận dị ứng
        assertTrue(response.getReply().contains("dị ứng") || response.getReply().contains("thịt gà") || response.getReply().contains("hải sản"));
        // Phải đề cập voucher
        assertTrue(response.getReply().toLowerCase().contains("voucher") || response.getReply().toLowerCase().contains("ưu đãi"));
        // Phải đề cập phương thức thanh toán
        assertTrue(response.getReply().toLowerCase().contains("thanh toán"));
        // Tuyệt đối không gợi ý món vi phạm dị ứng
        for (var dish : response.getRecommendedDishes()) {
            String nameLower = dish.getName().toLowerCase();
            assertFalse(nameLower.contains("gà"), "Tuyệt đối không được chứa gà: " + dish.getName());
            assertFalse(nameLower.contains("hải sản") || nameLower.contains("tôm") || nameLower.contains("cua"), "Tuyệt đối không được chứa hải sản: " + dish.getName());
        }
    }

    @Test
    @DisplayName("Nghiệp vụ Đa ý định KHÔNG dị ứng: Hẹn hò 2 người + Ngân sách 500k + Voucher + Thanh toán")
    void testMultiIntentWithoutAllergyDateNightBudgetVoucherPayment() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Tôi đi hẹn hò với 1 người nữa, ngân sách 500k, quán có voucher nào không và thanh toán qua đâu?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());
        String replyLower = response.getReply().toLowerCase();

        // Phải có thực đơn cho 2 người
        assertTrue(replyLower.contains("hẹn hò") || replyLower.contains("2 người") || replyLower.contains("thực đơn"));
        // Phải đề cập voucher
        assertTrue(replyLower.contains("voucher") || replyLower.contains("ưu đãi"));
        // Phải đề cập phương thức thanh toán
        assertTrue(replyLower.contains("thanh toán"));
        // KHÔNG được nhắc nhầm "quý khách dị ứng với" vì khách không khai báo dị ứng
        assertFalse(response.getReply().contains("✅ **Em đã ghi nhận quý khách dị ứng"));
        // Phải có món gợi ý
        assertFalse(response.getRecommendedDishes().isEmpty());
    }

    @Test
    @DisplayName("Khả năng phục hồi Schema: Gemini trả về format recommendation/reason/voucher thay vì reply")
    void testParseGeminiCustomSchemaRecommendationReason() {
        String customJson = "{\n" +
                "  \"recommendation\": \"Combo Nướng Bò Mỹ và Lẩu\",\n" +
                "  \"reason\": \"Món ăn ấm cúng rất hợp không khí đôi lứa.\",\n" +
                "  \"voucher_details\": \"Giảm 10% cho khách đặt bàn trước.\",\n" +
                "  \"payment_methods\": [\"VNPAY\", \"Tiền mặt\", \"Thẻ tín dụng\"]\n" +
                "}";

        java.util.Map<String, MenuItemEntity> itemMap = new java.util.HashMap<>();
        for (MenuItemEntity item : sampleMenu) {
            itemMap.put(item.getId(), item);
        }

        AiChatResponse response = ReflectionTestUtils.invokeMethod(
                aiChatbotService,
                "parseAndValidateGeminiResponse",
                customJson,
                itemMap,
                "gemini-3.5-flash-lite",
                "Tôi muốn món ấm cúng hẹn hò"
        );

        assertNotNull(response);
        assertNotNull(response.getReply());
        assertFalse(response.getReply().trim().isEmpty(), "Reply không được để trống khi Gemini trả schema recommendation");
        assertTrue(response.getReply().contains("Combo Nướng Bò Mỹ"));
        assertTrue(response.getReply().contains("ấm cúng"));
        assertTrue(response.getReply().contains("VOUCHER"));
        assertTrue(response.getReply().contains("THANH TOÁN"));
    }

    @Test
    @DisplayName("Khả năng chịu lỗi: Chuỗi bị biến dạng ký tự '?' từ terminal vẫn nhận diện đúng dị ứng và ngân sách")
    void testQuestionMarkResilience() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        // Chuỗi bị lỗi mã hoá CP437 từ shell: "d? ung", "h?i s?n", "tri?u"
        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi b? d? ung h?i s?n, ngân sách 2 tri?u");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response.getReply());
        // Phải nhận diện được dị ứng hải sản
        assertTrue(response.getReply().contains("hải sản"));
        // Phải có disclaimer an toàn
        assertTrue(response.getReply().contains("an toàn dị ứng"));
        // Món gợi ý không được chứa hải sản
        for (var dish : response.getRecommendedDishes()) {
            assertFalse(dish.getName().toLowerCase().contains("hải sản"));
            assertFalse(dish.getName().toLowerCase().contains("tôm"));
            assertFalse(dish.getName().toLowerCase().contains("cua"));
        }
    }

    @Test
    @DisplayName("Kiểm tra món cụ thể có hải sản không: Món CÓ chứa hải sản -> Cảnh báo nguy hiểm & Đề xuất món lẩu an toàn thay thế")
    void testDishIngredientCheckUnsafeDish() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món lẩu thái này có hải sản không, tôi bị dị ứng");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        // Phải cảnh báo rõ món CÓ CHỨA hải sản và không nên dùng
        assertTrue(response.getReply().contains("CÓ CHỨA"), "Phải xác nhận món có chứa dị ứng");
        assertTrue(response.getReply().contains("TUYỆT ĐỐI KHÔNG NÊN DÙNG"), "Phải khuyên khách tuyệt đối không nên dùng");
        // Phải gợi ý món thay thế an toàn (Lẩu Gà Đồi Nấu Lá É)
        assertTrue(response.getReply().contains("Lẩu Gà Đồi Nấu Lá É"), "Phải gợi ý món lẩu an toàn thay thế");
        assertEquals("Dish-Allergen-Inspector", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải đính kèm thẻ món ăn an toàn");
        assertEquals("Lẩu Gà Đồi Nấu Lá É Phú Yên", response.getRecommendedDishes().get(0).getName());
    }

    @Test
    @DisplayName("Kiểm tra món cụ thể có hải sản không: Món KHÔNG chứa hải sản -> Xác nhận an toàn & Cho phép dùng bữa")
    void testDishIngredientCheckSafeDish() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Lẩu gà lá é này có hải sản không, tôi bị dị ứng hải sản?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        // Phải xác nhận HOÀN TOÀN KHÔNG CHỨA hải sản
        assertTrue(response.getReply().contains("HOÀN TOÀN KHÔNG CHỨA"), "Phải xác nhận món an toàn");
        assertTrue(response.getReply().contains("an tâm thưởng thức"), "Phải thông báo an tâm thưởng thức");
        assertEquals("Dish-Allergen-Inspector", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải đính kèm thẻ món an toàn để khách thêm giỏ");
        assertEquals("Lẩu Gà Đồi Nấu Lá É Phú Yên", response.getRecommendedDishes().get(0).getName());
    }

    @Test
    @DisplayName("Hội thoại 2 lượt: Khách hỏi món lẩu -> Lượt sau hỏi 'món lẩu này có hải sản không, tôi bị dị ứng' -> Bot truy vết món đề xuất và kiểm tra đúng món đó")
    void testDishIngredientCheckWithHistoryReferencingSuggestedHotpot() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        // Giả lập lịch sử hội thoại trước đó: Bot đã đề xuất Set Lẩu Thái Hải Sản
        List<ChatMessageDto> history = new ArrayList<>();
        history.add(ChatMessageDto.builder().role("user").content("Tư vấn cho tôi món lẩu ngon của quán").build());
        history.add(ChatMessageDto.builder().role("assistant").content("Dạ quán xin gợi ý Set Lẩu Thái Hải Sản Tomyum Cốt Dừa rất đậm đà thơm ngon ạ!").build());

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món lẩu này có hải sản không, tôi bị dị ứng");
        request.setHistory(history);

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        // Phải nhận diện đúng món đề xuất từ history là Set Lẩu Thái và cảnh báo CÓ CHỨA hải sản
        assertTrue(response.getReply().contains("Set Lẩu Thái Hải Sản Tomyum Cốt Dừa"), "Phải truy vết đúng món lẩu từ history");
        assertTrue(response.getReply().contains("CÓ CHỨA"), "Phải xác nhận món lẩu thái có chứa hải sản");
        assertTrue(response.getReply().contains("TUYỆT ĐỐI KHÔNG NÊN DÙNG"), "Phải cảnh báo khách không nên dùng");
        // Phải gợi ý món lẩu an toàn thay thế (Lẩu gà lá é)
        assertTrue(response.getReply().contains("Lẩu Gà Đồi Nấu Lá É Phú Yên"), "Phải gợi ý món lẩu không chứa hải sản thay thế");
        assertEquals("Dish-Allergen-Inspector", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
        assertEquals("Lẩu Gà Đồi Nấu Lá É Phú Yên", response.getRecommendedDishes().get(0).getName());
    }

    @Test
    @DisplayName("Hỏi giá món: 'Món phở bò này giá bao nhiêu tiền?' -> Trả lời chính xác 65,000 đ & đính kèm thẻ món")
    void testDishInquiryPrice() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món phở bò này giá bao nhiêu tiền?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("65,000"), "Phải trả về đúng giá niêm yết 65,000 đ");
        assertTrue(response.getReply().contains("Phở bò tái nạm"), "Phải nêu tên món ăn");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
        assertEquals("Phở bò tái nạm", response.getRecommendedDishes().get(0).getName());
    }

    @Test
    @DisplayName("Hỏi độ cay món: 'Món lẩu thái này có cay không?' -> Trả lời Cấp độ 2/5 (cay vừa thơm nồng)")
    void testDishInquirySpicyLevel() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món lẩu thái này có cay không?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("Cấp độ 2/5"), "Phải trả về đúng cấp độ cay 2/5");
        assertTrue(response.getReply().contains("Set Lẩu Thái"), "Phải nêu tên món ăn");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
    }

    @Test
    @DisplayName("Hỏi món chay hay mặn: 'Lẩu gà lá é này ăn chay được không?' -> Xác nhận MÓN MẶN")
    void testDishInquiryVegetarian() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Lẩu gà lá é này ăn chay được không?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("MÓN MẶN"), "Phải xác nhận là món mặn không ăn chay được");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
    }

    @Test
    @DisplayName("Hỏi thành phần món: 'Set lẩu thái gồm những thành phần gì?' -> Trả lời đúng thành phần / mô tả")
    void testDishInquiryIngredients() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Set lẩu thái gồm những thành phần gì?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("Thành phần & Nguyên liệu chế biến"), "Phải có phần trả lời thành phần");
        assertTrue(response.getReply().contains("Tomyum cốt dừa"), "Phải hiển thị mô tả thành phần chuẩn của món");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
    }

    @Test
    @DisplayName("Hỏi thứ thực thể KHÔNG có: 'Món cơm tấm này có bao nhiêu calo?' -> Trung thực thông báo quán chưa ghi nhận, không bịa đặt số liệu")
    void testDishInquiryOutOfEntityCalories() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món cơm tấm này có bao nhiêu calo?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("chưa ghi nhận"), "Phải trung thực báo quán chưa ghi nhận thông tin này");
        assertTrue(response.getReply().contains("Calo"), "Phải đề cập đúng trường năng lượng Calo mà khách hỏi");
        assertTrue(response.getReply().contains("Cơm tấm sườn nướng"), "Vẫn cung cấp đầy đủ thông tin chuẩn của món");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
    }

    @Test
    @DisplayName("Hỏi món KHÔNG có trong thực đơn quán: 'Quán có pizza hải sản không?' -> Thông báo quán không phục vụ & gợi ý món trứ danh")
    void testDishInquiryNonExistentDish() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Quán có pizza hải sản không?");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("không có trong thực đơn"), "Phải thông báo món không có trong thực đơn");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải gợi ý các món đặc sản trứ danh của quán");
    }

    @Test
    @DisplayName("Hội thoại 2 lượt: Khách hỏi món phở -> Lượt sau hỏi 'Món này giá bao nhiêu tiền?' -> Truy vết đúng món đề xuất")
    void testDishInquiryMultiTurnHistory() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        List<ChatMessageDto> history = new ArrayList<>();
        history.add(ChatMessageDto.builder().role("user").content("Tư vấn cho tôi món phở").build());
        history.add(ChatMessageDto.builder().role("assistant").content("Dạ quán xin gợi ý món Phở bò tái nạm thơm ngon đậm đà ạ!").build());

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Món này giá bao nhiêu tiền?");
        request.setHistory(history);

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());

        assertTrue(response.getReply().contains("Phở bò tái nạm"), "Phải truy vết đúng món phở từ lượt chat trước");
        assertTrue(response.getReply().contains("65,000"), "Phải trả lời đúng giá 65,000 đ");
        assertEquals("Dish-Information-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());
        assertEquals("Phở bò tái nạm", response.getRecommendedDishes().get(0).getName());
    }

    @Test
    @DisplayName("Hỏi danh mục món cụ thể: 'Tôi muốn ăn lẩu' -> Chỉ gợi ý món lẩu, TUYỆT ĐỐI không gợi ý phở hay bún")
    void testCategoryQueryHotpot() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi muốn ăn lẩu");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertEquals("Food-Category-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());

        // Kiểm tra toàn bộ món gợi ý đều là món Lẩu
        for (var dish : response.getRecommendedDishes()) {
            assertTrue(dish.getName().toLowerCase().contains("lẩu"),
                    "Món đề xuất phải thuộc danh mục lẩu, nhưng nhận được: " + dish.getName());
            assertFalse(dish.getName().toLowerCase().contains("phở"),
                    "Tuyệt đối không được gợi ý phở khi khách hỏi lẩu: " + dish.getName());
            assertFalse(dish.getName().toLowerCase().contains("bún"),
                    "Tuyệt đối không được gợi ý bún khi khách hỏi lẩu: " + dish.getName());
            assertFalse(dish.getName().toLowerCase().contains("cơm"),
                    "Tuyệt đối không được gợi ý cơm khi khách hỏi lẩu: " + dish.getName());
        }
    }

    @Test
    @DisplayName("Hỏi 'tôi muốn lẩu': Khi danh mục 'Lẩu & Món Nhắm' có cả món nhắm, TUYỆT ĐỐI chỉ gợi ý món có chữ 'lẩu'")
    void testQueryHotpotNeverSuggestsAppetizersOrNonHotpotDishes() {
        CategoryEntity lauCat = CategoryEntity.builder().name("Lẩu & Món Nhắm").build();
        lauCat.setId("cat-04");

        MenuItemEntity lauRieuCua = MenuItemEntity.builder()
                .code("LAU-01")
                .name("Set Lẩu Riêu Cua Bắp Bò Sườn Sụn")
                .category(lauCat)
                .basePrice(new BigDecimal("389000"))
                .status(MenuStatus.available)
                .mealPeriods("EVENING")
                .build();
        lauRieuCua.setId("dish-lau-rieu-cua");

        MenuItemEntity gaUMuoi = MenuItemEntity.builder()
                .code("NHA-01")
                .name("Gà Ta Ủ Muối Hoa Tiêu Nửa Con")
                .category(lauCat) // Cùng danh mục Lẩu & Món Nhắm
                .basePrice(new BigDecimal("160000"))
                .status(MenuStatus.available)
                .mealPeriods("NOON,EVENING")
                .build();
        gaUMuoi.setId("dish-ga-u-muoi");

        MenuItemEntity boTo = MenuItemEntity.builder()
                .code("NHA-02")
                .name("Bò Tơ Cuộn Rau Rừng Bánh Tráng")
                .category(lauCat) // Cùng danh mục Lẩu & Món Nhắm
                .basePrice(new BigDecimal("155000"))
                .status(MenuStatus.available)
                .mealPeriods("NOON,EVENING")
                .build();
        boTo.setId("dish-bo-to");

        List<MenuItemEntity> testMenu = new ArrayList<>(sampleMenu);
        testMenu.add(lauRieuCua);
        testMenu.add(gaUMuoi);
        testMenu.add(boTo);

        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(testMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi muốn lẩu");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải gợi ý món lẩu");

        for (var dish : response.getRecommendedDishes()) {
            assertTrue(dish.getName().toLowerCase().contains("lẩu"),
                    "Mọi món gợi ý khi khách hỏi lẩu BẮT BUỘC phải có chữ 'lẩu' trong tên: " + dish.getName());
            assertFalse(dish.getName().contains("Gà Ta Ủ Muối"), "Tuyệt đối không nhặt món nhắm Gà Ủ Muối vào gợi ý lẩu");
            assertFalse(dish.getName().contains("Bò Tơ Cuộn"), "Tuyệt đối không nhặt món nhắm Bò Tơ Cuộn vào gợi ý lẩu");
        }
    }

    @Test
    @DisplayName("Hỏi 'quán có lẩu không': Không được báo quán không có món lẩu, mà phải liệt kê các món lẩu của quán")
    void testQueryRestaurantHasHotpotInquiry() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("quán có lẩu không");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertFalse(response.getReply().contains("rất tiếc là hiện tại món lẩu không có trong thực đơn"),
                "Không được báo quán không có lẩu khi quán có bán lẩu");
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải liệt kê các món lẩu của quán");

        for (var dish : response.getRecommendedDishes()) {
            assertTrue(dish.getName().toLowerCase().contains("lẩu"),
                    "Món được gợi ý phải là món lẩu: " + dish.getName());
        }
    }

    @Test
    @DisplayName("Hỏi lẩu kèm dị ứng hải sản: 'tôi muốn ăn lẩu, tôi bị dị ứng hải sản' -> Lọc bỏ lẩu Thái hải sản, chỉ gợi ý lẩu gà lá é")
    void testCategoryQueryHotpotWithSeafoodAllergy() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi muốn ăn lẩu, tôi bị dị ứng hải sản");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertEquals("Food-Category-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());

        // Phải gợi ý Lẩu Gà Đồi Nấu Lá É và loại bỏ Set Lẩu Thái Hải Sản
        boolean hasLauGa = response.getRecommendedDishes().stream()
                .anyMatch(d -> d.getName().contains("Lẩu Gà"));
        boolean hasLauThai = response.getRecommendedDishes().stream()
                .anyMatch(d -> d.getName().contains("Lẩu Thái") || d.getName().contains("Hải Sản"));

        assertTrue(hasLauGa, "Phải gợi ý món lẩu an toàn (Lẩu Gà Lá É)");
        assertFalse(hasLauThai, "Bắt buộc lọc bỏ Lẩu Thái vì có chứa dị ứng hải sản");
        assertTrue(response.getReply().contains("⚠️"), "Phải có disclaimer cảnh báo an toàn dị ứng");
    }

    @Test
    @DisplayName("Hỏi danh mục Phở: 'cho tôi một phần phở' -> Chỉ gợi ý Phở, không gợi ý Lẩu hay Bún")
    void testCategoryQueryPho() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("cho tôi một phần phở");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertEquals("Food-Category-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty());

        for (var dish : response.getRecommendedDishes()) {
            assertTrue(dish.getName().toLowerCase().contains("phở"),
                    "Món đề xuất phải là phở: " + dish.getName());
            assertFalse(dish.getName().toLowerCase().contains("lẩu"),
                    "Không được gợi ý lẩu khi khách hỏi phở: " + dish.getName());
        }
    }

    @Test
    @DisplayName("Kiểm tra món ngoài giờ phục vụ: Món chỉ phục vụ MORNING không được gợi ý vào ca EVENING")
    void testOutOfPeriodDishNotRecommended() {
        // Cấu hình thời gian là 19:00 tối (ca EVENING)
        // 12:00:00 UTC = 19:00:00 Asia/Ho_Chi_Minh
        ReflectionTestUtils.setField(aiChatbotService, "clock",
                java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T12:00:00Z"), java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        CategoryEntity foodCat = CategoryEntity.builder().name("Điểm tâm").build();
        foodCat.setId("cat-breakfast");

        MenuItemEntity banhCuon = MenuItemEntity.builder()
                .code("BC-01")
                .name("Bánh cuốn nóng chả quế")
                .category(foodCat)
                .basePrice(new BigDecimal("45000"))
                .status(MenuStatus.available)
                .mealPeriods("MORNING") // Chỉ bán buổi sáng 06:00 - 10:30
                .build();
        banhCuon.setId("dish-banh-cuon");

        List<MenuItemEntity> menuWithMorningDish = new ArrayList<>(sampleMenu);
        menuWithMorningDish.add(banhCuon);

        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(menuWithMorningDish);

        // 1. Khi hỏi tư vấn món ăn rẻ nhất / bình dân vào buổi tối:
        AiChatRequest req = new AiChatRequest();
        req.setMessage("cho món rẻ nhất");

        AiChatResponse res = aiChatbotService.chat(req);
        assertNotNull(res);
        assertNotNull(res.getRecommendedDishes());

        // Bánh cuốn rẻ hơn các món khác (45k) nhưng chỉ bán sáng -> Không được gợi ý lúc 19:00 tối!
        for (var dish : res.getRecommendedDishes()) {
            assertNotEquals("Bánh cuốn nóng chả quế", dish.getName(),
                    "Món chỉ bán ca sáng không được phép gợi ý vào ca tối");
        }

        // 2. Khi hỏi thông tin trực tiếp về Bánh cuốn:
        AiChatRequest reqInquiry = new AiChatRequest();
        reqInquiry.setMessage("quán có bánh cuốn nóng chả quế không");

        AiChatResponse resInquiry = aiChatbotService.chat(reqInquiry);
        assertNotNull(resInquiry);
        // Bot nhận diện đúng món, nhưng gắn cờ availableNow = false
        assertFalse(resInquiry.getRecommendedDishes().isEmpty());
        var inquiredDish = resInquiry.getRecommendedDishes().get(0);
        assertEquals("Bánh cuốn nóng chả quế", inquiredDish.getName());
        assertEquals(Boolean.FALSE, inquiredDish.getAvailableNow());
        assertTrue(resInquiry.getReply().contains("hết thời gian phục vụ") || resInquiry.getReply().contains("chưa được mở bán"));
        assertTrue(resInquiry.getReply().contains("vui lòng quay lại vào giờ"));
    }

    @Test
    @DisplayName("Khách hỏi món ở khung giờ khác (hỏi lẩu lúc 8:30 sáng) -> Vẫn phải liệt kê, gợi ý, có cờ availableNow=false, kèm dòng lưu ý quay lại vào giờ...")
    void testHotpotCategoryRecommendationWhenOutOfPeriodIncludesDishesWithNoticeAndNoAddToCart() {
        // Cấu hình thời gian là 08:30 sáng (ca MORNING: 06:00 - 10:30)
        // 01:30:00 UTC = 08:30:00 Asia/Ho_Chi_Minh
        ReflectionTestUtils.setField(aiChatbotService, "clock",
                java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T01:30:00Z"), java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        // Set Lẩu chỉ bán trưa và tối (NOON,EVENING)
        List<MenuItemEntity> hotpotMenu = new ArrayList<>();
        for (MenuItemEntity item : sampleMenu) {
            if (item.getName().contains("Lẩu")) {
                item.setMealPeriods("NOON,EVENING");
            }
            hotpotMenu.add(item);
        }

        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(hotpotMenu);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi muốn ăn lẩu");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertEquals("Food-Category-Engine", response.getModelUsed());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Dù ngoài giờ phục vụ, vẫn phải liệt kê và gợi ý các món lẩu theo yêu cầu của khách");

        // Kiểm tra toàn bộ món gợi ý đều là món Lẩu và có availableNow = false
        for (var dish : response.getRecommendedDishes()) {
            assertTrue(dish.getName().toLowerCase().contains("lẩu"), "Món đề xuất phải là món lẩu");
            assertEquals(Boolean.FALSE, dish.getAvailableNow(), "Món lẩu chưa đến giờ bán phải có availableNow = false");
            assertNotNull(dish.getMealPeriodNote(), "Phải có ghi chú khung giờ mở bán");
        }

        // Lời đáp phải kèm dòng lưu ý món chưa được mở bán và thời gian quay lại
        String reply = response.getReply();
        assertTrue(reply.contains("chưa được mở bán"), "Lời đáp bắt buộc chứa thông báo 'chưa được mở bán'");
        assertTrue(reply.contains("vui lòng quay lại vào giờ") || reply.contains("Vui lòng quay lại vào giờ"),
                "Lời đáp bắt buộc kèm dòng lưu ý 'vui lòng quay lại vào giờ'");
        assertFalse(reply.contains("Quý khách bấm **'Thêm giỏ'** các món trên"),
                "Không được mời khách thêm giỏ hàng đối với các món chưa mở bán");
    }

    @Test
    @DisplayName("Khách hỏi món cụ thể ở khung giờ khác (hỏi bánh cuốn lúc 19:00 tối) -> Vẫn liệt kê, availableNow=false, kèm lưu ý quay lại vào giờ sáng")
    void testOutOfPeriodSpecificDishRecommendation() {
        // Cấu hình thời gian là 19:00 tối (ca EVENING)
        ReflectionTestUtils.setField(aiChatbotService, "clock",
                java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T12:00:00Z"), java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        CategoryEntity foodCat = CategoryEntity.builder().name("Điểm tâm").build();
        foodCat.setId("cat-breakfast");

        MenuItemEntity banhCuon = MenuItemEntity.builder()
                .code("BC-01")
                .name("Bánh cuốn nóng chả quế")
                .category(foodCat)
                .basePrice(new BigDecimal("45000"))
                .status(MenuStatus.available)
                .mealPeriods("MORNING") // Chỉ bán buổi sáng 06:00 - 10:30
                .build();
        banhCuon.setId("dish-banh-cuon");

        List<MenuItemEntity> menuWithMorningDish = new ArrayList<>(sampleMenu);
        menuWithMorningDish.add(banhCuon);

        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(menuWithMorningDish);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi muốn ăn bánh cuốn nóng chả quế");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertNotNull(response.getReply());
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải gợi ý món Bánh cuốn dù ngoài giờ");

        var dish = response.getRecommendedDishes().get(0);
        assertEquals("Bánh cuốn nóng chả quế", dish.getName());
        assertEquals(Boolean.FALSE, dish.getAvailableNow());
        assertTrue(response.getReply().contains("chưa được mở bán"));
        assertTrue(response.getReply().contains("vui lòng quay lại vào giờ") || response.getReply().contains("Vui lòng quay lại vào giờ"));
        assertTrue(response.getReply().contains("Sáng (06:00 - 10:30)"));
    }

    @Test
    @DisplayName("P0 Issue 2.4: 'Bán chạy' tuyệt đối không bị nhận diện nhầm thành 'ăn chay'")
    void testBanChayDoesNotTriggerVegetarian() {
        String query = "Cho tôi xem các món bán chạy nhất của quán";
        String norm = AiChatbotService.removeAccents(query);
        AiChatbotService.AllergyProfile profile = AiChatbotService.detectAllergyProfile(norm, null);

        assertFalse(profile.isVegetarian, "'bán chạy' tuyệt đối không được kích hoạt chế độ ăn chay (isVegetarian)");
    }

    @Test
    @DisplayName("P0 Issue 2.3: Xử lý phủ định dị ứng - 'Tôi không dị ứng hải sản, chỉ kiêng gà'")
    void testNegationAllergyDoesNotTriggerRestriction() {
        String query = "Tôi không dị ứng hải sản, chỉ kiêng thịt gà";
        String norm = AiChatbotService.removeAccents(query);
        AiChatbotService.AllergyProfile profile = AiChatbotService.detectAllergyProfile(norm, null);

        assertFalse(profile.noSeafood, "Câu 'không dị ứng hải sản' tuyệt đối không được đánh dấu noSeafood = true");
        assertTrue(profile.noChicken, "Câu 'kiêng thịt gà' phải bật noChicken = true");
    }

    @Test
    @DisplayName("P0 Issue 2.5: Dị ứng được nhớ xuyên suốt qua các lượt hội thoại (Cross-turn Allergy Memory)")
    void testCrossTurnAllergyMemory() {
        when(menuItemRepository.findByStatus(MenuStatus.available)).thenReturn(sampleMenu);

        // Lượt 1: Khách thông báo dị ứng hải sản
        List<ChatMessageDto> history = new ArrayList<>();
        history.add(ChatMessageDto.builder().role("user").content("Tôi bị dị ứng hải sản").build());
        history.add(ChatMessageDto.builder().role("assistant").content("Dạ em đã ghi nhận quý khách bị dị ứng hải sản ạ!").build());

        // Lượt 2: Khách chỉ nói "đổi món khác rẻ hơn" mà không nhắc lại dị ứng
        AiChatRequest request = new AiChatRequest();
        request.setMessage("đổi món khác rẻ hơn");
        request.setHistory(history);

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertFalse(response.getRecommendedDishes().isEmpty(), "Phải gợi ý món an toàn");

        // Tuyệt đối không được gợi ý món hải sản (Set Lẩu Thái Hải Sản) dù khách không nhắc lại ở lượt này
        for (var dish : response.getRecommendedDishes()) {
            assertNotEquals("LAU-01", dish.getCode(), "Món hải sản Set Lẩu Thái tuyệt đối không được đề xuất ở lượt sau");
            assertFalse(dish.getName().toLowerCase().contains("hải sản"), "Món đề xuất không được chứa hải sản: " + dish.getName());
        }
    }

    @Test
    @DisplayName("P0 Issue 2.8: Hand-off y tế khẩn cấp khi phát hiện sốc phản vệ / khó thở")
    void testEmergencyMedicalHandOff() {
        AiChatRequest request = new AiChatRequest();
        request.setMessage("tôi vừa ăn xong thấy bị sốc phản vệ khó thở quá");

        AiChatResponse response = aiChatbotService.chat(request);
        assertNotNull(response);
        assertEquals("Emergency-Medical-Hand-off", response.getModelUsed());
        assertTrue(response.getReply().contains("115"), "Phải cung cấp đường dây nóng cấp cứu 115");
        assertTrue(response.getReply().contains("KHẨN CẤP") || response.getReply().contains("y tế"), "Phải có cảnh báo khẩn cấp");
        assertTrue(response.getRecommendedDishes().isEmpty(), "Tuyệt đối không đính kèm thẻ món khi xảy ra biến cố y tế");
    }

    @Test
    @DisplayName("P1 Issue 6: detectPartySize nhận diện chính xác 3 người, 5 người không bị nhiễu bởi số tiền 300k, 2.4tr")
    void testPartySizeAccuracyWithPrices() {
        int size1 = AiChatbotService.detectPartySize(AiChatbotService.removeAccents("bàn 3 người ăn, ngân sách 300k"));
        assertEquals(3, size1, "3 người phải nhận diện là 3, không bị số tiền 300k làm sai");

        int size2 = AiChatbotService.detectPartySize(AiChatbotService.removeAccents("cho 5 người ăn"));
        assertEquals(5, size2, "5 người phải nhận diện đúng 5");

        int size3 = AiChatbotService.detectPartySize(AiChatbotService.removeAccents("bàn 4 khách với ngân sách 2.4 triệu"));
        assertEquals(4, size3, "4 khách với 2.4 triệu phải nhận diện là 4");
    }

    @Test
    @DisplayName("P1 Issue 7: 'Gia đình' không bị norm.contains('gia') đẩy nhầm vào Dish Price Inquiry")
    void testDishInquiryRegexDoesNotMisclassifyGiaDinh() {
        String norm = AiChatbotService.removeAccents("Tôi muốn đặt bàn ăn cùng gia đình");
        boolean isDishInquiry = AiChatbotService.isDishInquiryQuery(norm, sampleMenu, null);
        assertFalse(isDishInquiry, "'gia đình' tuyệt đối không được coi là câu hỏi về giá món ăn (isDishInquiryQuery)");
    }
}

