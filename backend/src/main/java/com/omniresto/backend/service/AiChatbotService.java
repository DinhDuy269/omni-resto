package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.ai.*;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatbotService {

    private final MenuItemRepository menuItemRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.7-flash}")
    private String geminiModel;

    @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    @Value("${restaurant.wifi.ssid:OmniResto_Guest}")
    private String wifiSsid;

    @Value("${restaurant.wifi.password:OmniRestoGuest2026}")
    private String wifiPassword;

    public AiChatResponse chat(AiChatRequest request) {
        String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            return AiChatResponse.builder()
                    .reply("Dạ chào bạn! OmniBot có thể giúp gì cho bữa ăn hôm nay của bạn ạ? Bạn có thể hỏi về món bán chạy, món chay, món ít cay hoặc gợi ý combo theo ngân sách nhé! 🍲")
                    .recommendedDishes(Collections.emptyList())
                    .build();
        }

        // 1. Lấy danh sách món ăn đang phục vụ
        List<MenuItemEntity> availableItems = menuItemRepository.findByStatus(MenuStatus.available);
        if (availableItems.isEmpty()) {
            availableItems = menuItemRepository.findAll();
        }

        Map<String, MenuItemEntity> itemMap = availableItems.stream()
                .collect(Collectors.toMap(MenuItemEntity::getId, item -> item, (a, b) -> a));

        String lower = userMessage.toLowerCase().trim();

        // 2. PHÂN LUỒNG THEO Ý ĐỊNH (Intent-based Routing):
        // Các câu hỏi tính toán số học (ngân sách), cực trị (rẻ nhất, đắt nhất), tiện ích (wifi, payment)
        // đi thẳng vào bộ tính toán chính xác trên server (không tốn token, chuẩn 100%, không bị ảo giác số học).
        if (isDeterministicQuery(lower)) {
            return generateRuleBasedResponse(userMessage, availableItems);
        }

        // 3. Các câu hỏi mở (sở thích, hương vị, mô tả cảm xúc):
        // Nếu có cấu hình GEMINI_API_KEY, gọi API Google Gemini
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            try {
                AiChatResponse geminiResponse = callGeminiApi(userMessage, request.getHistory(), availableItems, itemMap);
                if (geminiResponse != null && geminiResponse.getReply() != null && !geminiResponse.getReply().trim().isEmpty()) {
                    return geminiResponse;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed or quota exceeded: {}. Falling back to Rule-based assistant.", e.getMessage());
            }
        }

        // 4. Fallback an toàn nếu LLM không khả dụng
        return generateRuleBasedResponse(userMessage, availableItems);
    }

    private boolean isDeterministicQuery(String lower) {
        if (isGreetingQuery(lower)) return true;

        // Câu hỏi ngân sách có số tiền rõ ràng (ví dụ 100k, 100.000, 50k, 200 ngàn)
        if (lower.matches(".*\\b\\d+\\s*(k|nghìn|ngàn|000|đ|vnđ)\\b.*") &&
                (lower.contains("ngân sách") || lower.contains("tiền") || lower.contains("combo") || lower.contains("món mặn") || lower.contains("ăn"))) {
            return true;
        }

        // Cực trị giá cả
        if (lower.contains("rẻ nhất") || lower.contains("re nhat") || lower.contains("ít tiền nhất") || lower.contains("giá thấp nhất") || lower.contains("tiết kiệm nhất")) {
            return true;
        }
        if (lower.contains("đắt nhất") || lower.contains("dat nhat") || lower.contains("cao cấp nhất") || lower.contains("sang nhất") || lower.contains("nhiều tiền nhất")) {
            return true;
        }

        // Tiện ích wifi, thanh toán
        if (lower.contains("wifi") || lower.contains("mật khẩu") || lower.contains("pass") ||
                lower.contains("vietqr") || lower.contains("thanh toán") || lower.contains("chuyển khoản")) {
            return true;
        }

        return false;
    }

    private boolean isGreetingQuery(String lower) {
        return lower.matches("^(chào|chao|hi|hello|alo|helo|ê|ad|quán ơi|shop ơi|em ơi|bạn ơi).*") ||
                lower.equals("chào bạn") || lower.equals("chào em") || lower.equals("xin chào") || lower.equals("hello");
    }

    private AiChatResponse callGeminiApi(String userMessage, List<ChatMessageDto> history,
                                         List<MenuItemEntity> availableItems,
                                         Map<String, MenuItemEntity> itemMap) throws Exception {
        // Tạo JSON Menu Context nén gọn
        ArrayNode menuArray = objectMapper.createArrayNode();
        for (MenuItemEntity item : availableItems) {
            ObjectNode node = menuArray.addObject();
            node.put("id", item.getId());
            node.put("name", item.getName());
            node.put("price", item.getPrice() != null ? item.getPrice().longValue() : 0);
            node.put("cat", item.getCategory() != null ? item.getCategory().getName() : "");
            node.put("desc", item.getDescription() != null ? item.getDescription() : "");
            node.put("veg", Boolean.TRUE.equals(item.getIsVegetarian()));
            node.put("spicy", item.getSpicyLevel() != null ? item.getSpicyLevel() : 0);
            if (item.getAllergens() != null) {
                node.put("allergens", item.getAllergens());
            }
            node.put("allergenVerified", Boolean.TRUE.equals(item.getAllergenVerified()));
        }
        String compactMenuJson = objectMapper.writeValueAsString(menuArray);

        String systemPrompt = "Bạn là 'OmniBot' - Trợ lý ẩm thực ảo thân thiện, lịch sự của nhà hàng OmniResto tại Việt Nam.\n" +
                "Nhiệm vụ: Tư vấn món ăn theo khẩu vị, sở thích, ăn chay, ít cay, combo cho nhóm, đồ uống.\n" +
                "QUY TẮC BẢO MẬT & AN TOÀN BẮT BUỘC:\n" +
                "1. Chỉ được gợi ý các món ăn có trong danh sách MENU bên dưới. KHÔNG ĐƯỢC tự bịa món hoặc giá.\n" +
                "2. TUYỆT ĐỐI KHÔNG BAO GIỜ dùng các từ khẳng định an toàn y tế như '100% an toàn', 'đảm bảo an toàn', 'tuyệt đối không dị ứng'.\n" +
                "3. Khi khách hỏi về dị ứng hoặc món không cay, LUÔN KÈM LỜI NHẮC: 'Quý khách vui lòng thông báo trực tiếp với nhân viên phục vụ để bếp lưu ý chế biến riêng'.\n" +
                "4. Không bao giờ nói 'tôi đã thêm vào giỏ hàng', hãy mời khách bấm nút 'Thêm vào giỏ' trên thẻ món.\n" +
                "5. Định dạng trả về BẮT BUỘC là JSON thuần túy (không bọc mã markdown):\n" +
                "{\"reply\": \"lời tư vấn lịch sự, tự nhiên, kèm emoji ẩm thực\", \"itemIds\": [\"id_mon_1\", \"id_mon_2\"]}\n\n" +
                "DANH SÁCH MENU HIỆN TẠI:\n" + compactMenuJson;

        ObjectNode requestBody = objectMapper.createArrayNode().objectNode();

        // System Instruction
        ObjectNode systemInstruction = requestBody.putObject("system_instruction");
        systemInstruction.putObject("parts").put("text", systemPrompt);

        // Contents
        ArrayNode contents = requestBody.putArray("contents");

        // Thêm lịch sử hội thoại gần nhất (tối đa 4 câu)
        if (history != null) {
            int start = Math.max(0, history.size() - 4);
            for (int i = start; i < history.size(); i++) {
                ChatMessageDto msg = history.get(i);
                ObjectNode turn = contents.addObject();
                turn.put("role", "user".equalsIgnoreCase(msg.getRole()) ? "user" : "model");
                turn.putArray("parts").addObject().put("text", msg.getContent());
            }
        }

        // Câu hỏi hiện tại
        ObjectNode currentTurn = contents.addObject();
        currentTurn.put("role", "user");
        currentTurn.putArray("parts").addObject().put("text", userMessage);

        // Generation Config ép trả về JSON
        ObjectNode genConfig = requestBody.putObject("generationConfig");
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("temperature", 0.3);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

        List<String> modelsToTry = new ArrayList<>();
        if (geminiModel != null && !geminiModel.trim().isEmpty()) {
            modelsToTry.add(geminiModel.trim());
        }
        if (!modelsToTry.contains("gemini-3.5-flash")) {
            modelsToTry.add("gemini-3.5-flash");
        }
        if (!modelsToTry.contains("gemini-3.8-flash")) {
            modelsToTry.add("gemini-3.8-flash");
        }

        for (String modelToUse : modelsToTry) {
            try {
                String endpointUrl = String.format("%s/models/%s:generateContent?key=%s",
                        geminiBaseUrl, modelToUse, geminiApiKey.trim());

                ResponseEntity<String> response = restTemplate.postForEntity(endpointUrl, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && !candidates.isEmpty()) {
                        String text = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                        return parseAndValidateGeminiResponse(text, itemMap, modelToUse);
                    }
                }
            } catch (Exception e) {
                log.warn("Gemini call with model {} failed: {}. Trying fallback model if available...", modelToUse, e.getMessage());
            }
        }

        return null;
    }

    private AiChatResponse parseAndValidateGeminiResponse(String rawText, Map<String, MenuItemEntity> itemMap, String model) {
        try {
            String cleanJson = rawText.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7);
            }
            if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith("```")) {
                cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            }
            cleanJson = cleanJson.trim();

            JsonNode parsed = objectMapper.readTree(cleanJson);
            String reply = parsed.path("reply").asText();

            // Chặn từ ngữ khẳng định y tế tuyệt đối nếu LLM vô tình sinh ra
            reply = reply.replace("100% an toàn", "an tâm")
                    .replace("đảm bảo an toàn", "phù hợp");

            List<String> rawItemIds = new ArrayList<>();
            JsonNode idsNode = parsed.path("itemIds");
            if (idsNode.isArray()) {
                for (JsonNode idElem : idsNode) {
                    rawItemIds.add(idElem.asText());
                }
            }

            // Server-side validation: Lọc chỉ những itemId có thật trong quán
            List<AiRecommendedDishDto> validatedDishes = rawItemIds.stream()
                    .filter(itemMap::containsKey)
                    .map(itemMap::get)
                    .map(this::toDishDto)
                    .limit(4)
                    .collect(Collectors.toList());

            return AiChatResponse.builder()
                    .reply(reply)
                    .recommendedDishes(validatedDishes)
                    .modelUsed(model)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse Gemini structured JSON: {}", rawText, e);
            return AiChatResponse.builder()
                    .reply(rawText)
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed(model)
                    .build();
        }
    }

    private AiChatResponse generateRuleBasedResponse(String message, List<MenuItemEntity> items) {
        String lower = message.toLowerCase().trim();
        List<MenuItemEntity> matchedItems = new ArrayList<>();
        String reply;

        // 1. Chào hỏi
        if (isGreetingQuery(lower)) {
            return AiChatResponse.builder()
                    .reply("Dạ em chào quý khách ạ! Rất vui được đón tiếp quý khách tại **OmniResto** 🍲✨\n\nQuý khách hôm nay đi mấy người, và mình đang muốn tìm món ăn no, món thanh đạm ăn nhẹ hay cần gợi ý theo ngân sách? Em sẵn sàng tư vấn ngay cho mình ạ!")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 2. Ý định Ngân sách (Ví dụ: 100k, 150k...) + Combo món mặn + nước
        long extractedBudget = extractBudgetFromText(lower);
        boolean wantsCombo = (lower.contains("món mặn") || lower.contains("món ăn") || lower.contains("cơm") || lower.contains("bánh mì") || lower.contains("phở") || lower.contains("xôi")) &&
                (lower.contains("uống") || lower.contains("nước") || lower.contains("trà") || lower.contains("cà phê"));

        if (extractedBudget > 0 || (wantsCombo && (lower.contains("ngân sách") || lower.contains("tiền") || lower.contains("k")))) {
            long targetBudget = extractedBudget > 0 ? extractedBudget : 100000;
            boolean isNoSpicy = lower.contains("không cay") || lower.contains("không ăn được cay") || lower.contains("ko cay") || lower.contains("ít cay");
            boolean isNoSeafood = lower.contains("hải sản") || lower.contains("dị ứng") || lower.contains("tôm") || lower.contains("cua") || lower.contains("cá");

            List<MenuItemEntity> foods = items.stream()
                    .filter(i -> i.getCategory() == null || !i.getCategory().getName().toLowerCase().contains("uống"))
                    .filter(i -> {
                        String name = i.getName().toLowerCase();
                        String desc = i.getDescription() != null ? i.getDescription().toLowerCase() : "";
                        String ing = i.getIngredients() != null ? i.getIngredients().toLowerCase() : "";
                        if (isNoSpicy && i.getSpicyLevel() != null && i.getSpicyLevel() > 0) return false;
                        if (isNoSpicy && (name.contains("ớt") || desc.contains("cay") || ing.contains("ớt"))) return false;
                        if (isNoSeafood && (name.contains("cua") || name.contains("tôm") || name.contains("cá") || name.contains("hải sản"))) return false;
                        if (isNoSeafood && (desc.contains("cua") || desc.contains("tôm") || ing.contains("cua") || ing.contains("tôm"))) return false;
                        return true;
                    })
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = items.stream()
                    .filter(i -> i.getCategory() != null && i.getCategory().getName().toLowerCase().contains("uống"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            MenuItemEntity bestFood = null;
            MenuItemEntity bestDrink = null;
            long bestPairSum = 0;

            for (MenuItemEntity f : foods) {
                long fPrice = f.getPrice() != null ? f.getPrice().longValue() : 0;
                for (MenuItemEntity d : drinks) {
                    long dPrice = d.getPrice() != null ? d.getPrice().longValue() : 0;
                    long total = fPrice + dPrice;
                    if (total <= targetBudget && total > bestPairSum) {
                        bestFood = f;
                        bestDrink = d;
                        bestPairSum = total;
                    }
                }
            }

            if (bestFood != null && bestDrink != null) {
                matchedItems.add(bestFood);
                matchedItems.add(bestDrink);
                long change = targetBudget - bestPairSum;

                String foodName = bestFood.getName();
                String foodPrice = String.format("%,d", bestFood.getPrice().longValue());
                String drinkName = bestDrink.getName();
                String drinkPrice = String.format("%,d", bestDrink.getPrice().longValue());
                String totalStr = String.format("%,d", bestPairSum);
                String changeStr = String.format("%,d", change);

                // Safe Copywriting: Thay thế hoàn toàn "100% an toàn", kèm lưu ý xác nhận nhân viên
                String allergyNote;
                if (isNoSeafood || isNoSpicy) {
                    if (Boolean.TRUE.equals(bestFood.getAllergenVerified())) {
                        allergyNote = "Theo thông tin bếp đã xác nhận, món này không ghi nhận hải sản và không cay. Nếu bạn hoặc người đi cùng bị dị ứng, vui lòng báo nhân viên để bếp lưu ý nhé.";
                    } else {
                        allergyNote = "Món này chưa có thông tin xác nhận chính thức về thành phần dị ứng, bạn vui lòng hỏi nhân viên phục vụ trước khi gọi nhé.";
                    }
                } else {
                    allergyNote = "Món ăn tròn vị, dinh dưỡng và phù hợp cho bữa ăn đầy đặn.";
                }

                reply = String.format("Dạ với ngân sách **%s đ**, yêu cầu **1 món mặn + 1 đồ uống**, OmniBot xin gợi ý combo tối ưu nhất cho quý khách:\n\n" +
                                "1. 🍲 **Món mặn**: **%s** (%s đ)\n" +
                                "   - *Lưu ý*: %s\n" +
                                "2. 🍹 **Đồ uống**: **%s** (%s đ)\n" +
                                "   - *Hương vị*: Thức uống thanh mát, giải nhiệt sau món mặn.\n\n" +
                                "💰 **Tổng cộng**: **%s đ**%s.\n\n" +
                                "Mời quý khách bấm **Thêm giỏ** bên dưới cho cả 2 món để thưởng thức bữa ăn ngon miệng nhé!",
                        String.format("%,d", targetBudget), foodName, foodPrice, allergyNote, drinkName, drinkPrice, totalStr,
                        change > 0 ? String.format(" (vẫn còn dư **%s đ** trong ngân sách)", changeStr) : "");

                return AiChatResponse.builder()
                        .reply(reply)
                        .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                        .modelUsed("Rule-Based Assistant")
                        .build();
            }
        }

        // 3. Món rẻ nhất / bình dân
        boolean isCheapest = lower.contains("rẻ nhất") || lower.contains("re nhat") || lower.contains("ít tiền") ||
                lower.contains("giá thấp") || lower.contains("bình dân") || lower.contains("tiết kiệm");

        if (isCheapest) {
            List<MenuItemEntity> foods = items.stream()
                    .filter(i -> i.getCategory() == null || !i.getCategory().getName().toLowerCase().contains("uống"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = items.stream()
                    .filter(i -> i.getCategory() != null && i.getCategory().getName().toLowerCase().contains("uống"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            MenuItemEntity cheapestFood = !foods.isEmpty() ? foods.get(0) : null;
            MenuItemEntity cheapestDrink = !drinks.isEmpty() ? drinks.get(0) : null;

            if (cheapestFood != null) matchedItems.add(cheapestFood);
            if (cheapestDrink != null) matchedItems.add(cheapestDrink);

            String foodName = cheapestFood != null ? cheapestFood.getName() : "Món ăn";
            String foodPrice = cheapestFood != null && cheapestFood.getPrice() != null ? String.format("%,d", cheapestFood.getPrice().longValue()) : "0";
            String drinkName = cheapestDrink != null ? cheapestDrink.getName() : "Đồ uống";
            String drinkPrice = cheapestDrink != null && cheapestDrink.getPrice() != null ? String.format("%,d", cheapestDrink.getPrice().longValue()) : "0";

            reply = String.format("Dạ món ăn có mức giá tiết kiệm và bình dân nhất của quán hiện tại là **%s** chỉ với **%s đ** ạ! 😋\n\nVề thức uống thì có **%s** (%s đ). Toàn bộ món đều được chế biến từ nguyên liệu tươi mới trong ngày. Mời quý khách bấm 'Thêm giỏ' bên dưới để dùng thử nhé!",
                    foodName, foodPrice, drinkName, drinkPrice);

            return AiChatResponse.builder()
                    .reply(reply)
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 4. Món đắt nhất / sang nhất
        boolean isExpensive = lower.contains("đắt nhất") || lower.contains("dat nhat") || lower.contains("cao cấp nhất") ||
                lower.contains("sang nhất") || lower.contains("nhiều tiền nhất");

        if (isExpensive) {
            items.stream()
                    .sorted((a, b) -> b.getPrice().compareTo(a.getPrice()))
                    .findFirst()
                    .ifPresent(matchedItems::add);

            MenuItemEntity topDish = !matchedItems.isEmpty() ? matchedItems.get(0) : null;
            String name = topDish != null ? topDish.getName() : "";
            String price = topDish != null && topDish.getPrice() != null ? String.format("%,d", topDish.getPrice().longValue()) : "0";

            reply = String.format("Dạ món ăn thượng hạng và đầy đặn nhất của quán là **%s** (%s đ) ạ! 👑✨\n\nĐây là set ăn rất được ưa chuộng cho các bàn tiệc sum vầy hoặc gia đình. Quý khách bấm 'Thêm giỏ' ngay bên dưới để bếp chuẩn bị nhé!",
                    name, price);

            return AiChatResponse.builder()
                    .reply(reply)
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 5. Món chay / thanh đạm
        if (lower.contains("chay") || lower.contains("thanh đạm")) {
            matchedItems = items.stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsVegetarian()) ||
                            i.getName().toLowerCase().contains("chay") ||
                            i.getName().toLowerCase().contains("sen") ||
                            i.getName().toLowerCase().contains("nấm"))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ với quý khách dùng món thanh đạm hoặc món chay, bếp OmniResto có các món chế biến từ nếp nương, hạt sen và rau nấm tươi mát. Nếu quý khách có yêu cầu ăn chay nghiêm ngặt, vui lòng báo nhân viên phục vụ để bếp lưu ý chế biến riêng nhé! 🌿✨";
        } else if (lower.contains("không cay") || lower.contains("trẻ em") || lower.contains("em bé") || lower.contains("bé")) {
            matchedItems = items.stream()
                    .filter(i -> (i.getSpicyLevel() == null || i.getSpicyLevel() == 0) &&
                            (i.getName().toLowerCase().contains("phở") ||
                                    i.getName().toLowerCase().contains("cơm tấm") ||
                                    i.getName().toLowerCase().contains("xôi") ||
                                    i.getName().toLowerCase().contains("bánh cuốn")))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ đây là các món có vị thanh ngọt tự nhiên từ nước hầm xương và không nêm ớt cay. Để phù hợp nhất cho bé hoặc người không ăn được cay, bạn vui lòng dặn thêm nhân viên phục vụ ghi chú không tiêu ớt khi lên món nhé: 👶🍲";
        } else if (lower.contains("nhóm") || lower.contains("combo") || lower.contains("gia đình") || lower.contains("3 người") || lower.contains("4 người") || lower.contains("lẩu")) {
            matchedItems = items.stream()
                    .filter(i -> i.getName().toLowerCase().contains("lẩu") ||
                            i.getName().toLowerCase().contains("gà") ||
                            i.getName().toLowerCase().contains("bò") ||
                            i.getName().toLowerCase().contains("trà"))
                    .limit(3)
                    .collect(Collectors.toList());
            reply = "Dạ với nhóm từ 3 đến 4 người, em gợi ý quý khách thưởng thức combo lẩu ấm cúng kèm món ăn kèm và nước trà thanh nhiệt sum vầy ạ! 👨‍👩‍👧‍👦🍲";
        } else if (lower.contains("uống") || lower.contains("nước") || lower.contains("trà") || lower.contains("cà phê") || lower.contains("tráng miệng")) {
            matchedItems = items.stream()
                    .filter(i -> (i.getCategory() != null && i.getCategory().getName().toLowerCase().contains("uống")) ||
                            i.getName().toLowerCase().contains("trà") ||
                            i.getName().toLowerCase().contains("cà phê"))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ nhà hàng có các loại thức uống pha chế thủ công thanh mát và cà phê đậm đà giúp giải nhiệt và cân bằng khẩu vị cực tốt ạ: 🍹☕";
        } else if (lower.contains("vietqr") || lower.contains("thanh toán") || lower.contains("chuyển khoản") || lower.contains("tiền")) {
            return AiChatResponse.builder()
                    .reply("Dạ quý khách có thể thanh toán VietQR rất nhanh chóng:\n1. Chọn mục **'Đơn hàng'** trên menu.\n2. Bấm nút **'Quét mã VietQR'**, mã QR động với số tiền chính xác sẽ hiện ra.\n3. Quét trên app ngân hàng bất kỳ, hệ thống sẽ tự động ghi nhận thanh toán sau 2–3 giây ạ! 💳✨")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        } else if (lower.contains("wifi") || lower.contains("mật khẩu") || lower.contains("pass")) {
            return AiChatResponse.builder()
                    .reply(String.format("Dạ mật khẩu Wifi dành cho khách của nhà hàng OmniResto là: **%s** (Tên mạng: **%s**). Chúc quý khách dùng bữa thật ngon miệng ạ! 📶",
                            wifiPassword, wifiSsid))
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        } else {
            matchedItems = items.stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ để phục vụ đúng khẩu vị của quý khách, em xin phép gợi ý các lựa chọn tiêu biểu được ưa chuộng nhất hôm nay. Quý khách bấm 'Thêm giỏ' bên dưới để trải nghiệm nhé! 🍲✨";
        }

        List<AiRecommendedDishDto> dishes = matchedItems.stream()
                .map(this::toDishDto)
                .collect(Collectors.toList());

        return AiChatResponse.builder()
                .reply(reply)
                .recommendedDishes(dishes)
                .modelUsed("Rule-Based Assistant")
                .build();
    }

    private long extractBudgetFromText(String lower) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(k|nghìn|ngàn|000)");
        Matcher matcher = pattern.matcher(lower);
        if (matcher.find()) {
            try {
                long num = Long.parseLong(matcher.group(1));
                String unit = matcher.group(2);
                if ("000".equals(unit)) {
                    return num * 1000;
                }
                return num * 1000;
            } catch (Exception ignored) {
            }
        }
        return 0;
    }

    private AiRecommendedDishDto toDishDto(MenuItemEntity item) {
        return AiRecommendedDishDto.builder()
                .id(item.getId())
                .code(item.getCode())
                .name(item.getName())
                .category(item.getCategory() != null ? item.getCategory().getName() : "")
                .price(item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO)
                .description(item.getDescription())
                .imageUrl(item.getImageUrl())
                .isVegetarian(item.getIsVegetarian())
                .spicyLevel(item.getSpicyLevel())
                .allergens(item.getAllergens())
                .allergenVerified(item.getAllergenVerified())
                .spicyVerified(item.getSpicyVerified())
                .build();
    }
}
