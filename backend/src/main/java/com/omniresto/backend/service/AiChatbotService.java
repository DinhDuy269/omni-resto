package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.ai.*;
import com.omniresto.backend.repository.MenuItemRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiChatbotService {

    private final MenuItemRepository menuItemRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    @Value("${restaurant.wifi.ssid:OmniResto_Guest}")
    private String wifiSsid;

    @Value("${restaurant.wifi.password:OmniRestoGuest2026}")
    private String wifiPassword;

    // Cache menu items for 60 seconds to avoid slamming MySQL on every chat message
    private volatile List<MenuItemEntity> cachedAvailableItems = null;
    private volatile long cacheTimestamp = 0;
    private static final long CACHE_TTL_MS = 60_000L;

    public AiChatbotService(MenuItemRepository menuItemRepository, ObjectMapper objectMapper) {
        this.menuItemRepository = menuItemRepository;
        this.objectMapper = objectMapper;

        // Configure tight timeouts: 3s connect, 5s read to avoid hanging user chats
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    public AiChatResponse chat(AiChatRequest request) {
        String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            return AiChatResponse.builder()
                    .reply("Dạ chào bạn! OmniBot có thể giúp gì cho bữa ăn hôm nay của bạn ạ? Bạn có thể hỏi về món bán chạy, món thanh đạm, hoặc gợi ý combo theo ngân sách nhé! 🍲")
                    .recommendedDishes(Collections.emptyList())
                    .build();
        }

        // 1. Lấy danh sách món ăn đang phục vụ (có cache snapshot 60s)
        List<MenuItemEntity> availableItems = getAvailableMenuItems();
        Map<String, MenuItemEntity> itemMap = availableItems.stream()
                .collect(Collectors.toMap(MenuItemEntity::getId, item -> item, (a, b) -> a));

        String norm = removeAccents(userMessage);

        // 2. PHÂN LUỒNG THEO Ý ĐỊNH (Intent-based Routing):
        // Các câu hỏi tính toán thuần túy, cực trị, tiện ích đi thẳng vào server solver
        if (isDeterministicQuery(norm)) {
            return generateRuleBasedResponse(userMessage, availableItems);
        }

        // 3. Các câu hỏi mở (sở thích, không khí hẹn hò, lãng mạn, hương vị):
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            try {
                AiChatResponse geminiResponse = callGeminiApi(userMessage, request.getHistory(), availableItems, itemMap);
                if (geminiResponse != null && geminiResponse.getReply() != null && !geminiResponse.getReply().trim().isEmpty()) {
                    return geminiResponse;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed: {}. Falling back to Rule-based assistant.", e.getMessage());
            }
        }

        // 4. Fallback an toàn nếu LLM không khả dụng hoặc lỗi
        return generateRuleBasedResponse(userMessage, availableItems);
    }

    private List<MenuItemEntity> getAvailableMenuItems() {
        long now = System.currentTimeMillis();
        List<MenuItemEntity> cached = cachedAvailableItems;
        if (cached != null && (now - cacheTimestamp < CACHE_TTL_MS)) {
            return cached;
        }
        List<MenuItemEntity> items = menuItemRepository.findByStatus(MenuStatus.available);
        if (items.isEmpty()) {
            items = menuItemRepository.findAll();
        }
        cachedAvailableItems = items;
        cacheTimestamp = now;
        return items;
    }

    private boolean isDeterministicQuery(String norm) {
        if (isGreetingQuery(norm)) return true;

        // Nếu câu hỏi mang ngữ cảnh phong phú (hẹn hò, lãng mạn, sinh nhật, không khí...)
        // -> KHÔNG đẩy vào rule-based thô sơ, hãy để LLM xử lý gợi ý phù hợp vibe
        if (isRichVibeQuery(norm)) {
            return false;
        }

        // Câu hỏi ngân sách thuần túy (ví dụ: "cho combo 100k", "ngân sách 150k", "ăn gì 80 ngàn")
        long budget = extractBudgetFromText(norm);
        if (budget > 0 && (norm.contains("ngan sach") || norm.contains("tien") || norm.contains("combo") ||
                norm.contains("mon man") || norm.contains("an gi") || norm.contains("co mon gi"))) {
            return true;
        }

        // Cực trị giá cả
        if (norm.contains("re nhat") || norm.contains("it tien nhat") || norm.contains("gia thap nhat") ||
                norm.contains("tiet kiem nhat") || norm.contains("binh dan nhat")) {
            return true;
        }
        if (norm.contains("dat nhat") || norm.contains("cao cap nhat") || norm.contains("sang nhat") ||
                norm.contains("nhieu tien nhat")) {
            return true;
        }

        // Tiện ích wifi, thanh toán
        if (norm.contains("wifi") || norm.contains("mat khau") || norm.contains("pass") ||
                norm.contains("vietqr") || norm.contains("thanh toan") || norm.contains("chuyen khoan")) {
            return true;
        }

        return false;
    }

    private boolean isRichVibeQuery(String norm) {
        return norm.contains("hen ho") || norm.contains("lang man") || norm.contains("sinh nhat") ||
                norm.contains("am cung") || norm.contains("sang trong") || norm.contains("sang chanh") ||
                norm.contains("ban gai") || norm.contains("nguoi yeu") || norm.contains("tiec") ||
                norm.contains("an mung") || norm.contains("ky niem") || norm.contains("cau hon");
    }

    private boolean isGreetingQuery(String norm) {
        return norm.matches("^(chao|hi|hello|alo|helo|e|ad|quan oi|shop oi|em oi|ban oi).*") ||
                norm.equals("chao ban") || norm.equals("chao em") || norm.equals("xin chao") || norm.equals("hello");
    }

    private AiChatResponse callGeminiApi(String userMessage, List<ChatMessageDto> history,
                                         List<MenuItemEntity> availableItems,
                                         Map<String, MenuItemEntity> itemMap) {
        try {
            // Nén gọn Menu Context gửi kèm prompt
            ArrayNode menuArray = objectMapper.createArrayNode();
            for (MenuItemEntity item : availableItems) {
                // Bỏ qua các món không có giá hợp lệ
                if (item.getPrice() == null || item.getPrice().compareTo(BigDecimal.ZERO) <= 0) continue;

                ObjectNode node = menuArray.addObject();
                node.put("id", item.getId());
                node.put("name", item.getName());
                node.put("price", item.getPrice().longValue());
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

            String systemPrompt = "Bạn là 'OmniBot' - Trợ lý ẩm thực thân thiện của nhà hàng OmniResto tại Việt Nam.\n" +
                    "Nhiệm vụ: Tư vấn món ăn theo khẩu vị, không khí bàn ăn (hẹn hò, gia đình, gặp mặt), đồ uống.\n" +
                    "QUY TẮC BẢO MẬT & AN TOÀN BẮT BUỘC:\n" +
                    "1. Chỉ được gợi ý các món ăn có trong danh sách MENU bên dưới. KHÔNG ĐƯỢC tự bịa món hoặc giá.\n" +
                    "2. TUYỆT ĐỐI KHÔNG cam kết, bảo đảm hay khẳng định an toàn y tế/dị ứng (như 'an toàn tuyệt đối', 'không lo dị ứng', 'yên tâm ăn').\n" +
                    "3. Khi khách hỏi về dị ứng hoặc món không cay, nhắc khách trao đổi trực tiếp với nhân viên phục vụ để bếp lưu ý chế biến.\n" +
                    "4. Không bao giờ nói 'tôi đã thêm vào giỏ hàng', hãy mời khách bấm nút 'Thêm vào giỏ' trên thẻ món.\n" +
                    "5. Định dạng trả về BẮT BUỘC là JSON thuần túy (không kèm codeblock markdown):\n" +
                    "{\"reply\": \"lời tư vấn lịch sự, tự nhiên, kèm emoji ẩm thực\", \"itemIds\": [\"id_mon_1\", \"id_mon_2\"]}\n\n" +
                    "DANH SÁCH MENU HIỆN TẠI:\n" + compactMenuJson;

            ObjectNode requestBody = objectMapper.createArrayNode().objectNode();

            // System Instruction
            ObjectNode systemInstruction = requestBody.putObject("system_instruction");
            systemInstruction.putObject("parts").put("text", systemPrompt);

            // Contents
            ArrayNode contents = requestBody.putArray("contents");

            // Tối đa 4 câu hội thoại gần nhất
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

            // Generation Config
            ObjectNode genConfig = requestBody.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");
            genConfig.put("temperature", 0.4);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

            List<String> modelsToTry = new ArrayList<>();
            if (geminiModel != null && !geminiModel.trim().isEmpty()) {
                modelsToTry.add(geminiModel.trim());
            }
            if (!modelsToTry.contains("gemini-1.5-flash")) {
                modelsToTry.add("gemini-1.5-flash");
            }
            if (!modelsToTry.contains("gemini-2.0-flash")) {
                modelsToTry.add("gemini-2.0-flash");
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
                            return parseAndValidateGeminiResponse(text, itemMap, modelToUse, userMessage);
                        }
                    }
                } catch (HttpClientErrorException.TooManyRequests e) {
                    // Khi gặp HTTP 429 Quota Exceeded, quota tính theo Project/Billing Key nên không retry model khác
                    log.warn("🚨 Gemini API Quota Exceeded (HTTP 429). Short-circuiting model cascade to prevent lag.");
                    break;
                } catch (Exception e) {
                    log.warn("Gemini call with model {} failed: {}. Trying fallback model if available...", modelToUse, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to build or execute Gemini API request: {}", e.getMessage());
        }

        return null;
    }

    private AiChatResponse parseAndValidateGeminiResponse(String rawText, Map<String, MenuItemEntity> itemMap, String model, String originalUserMessage) {
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

            // Tự động gắn Disclaimer y tế tĩnh nếu phát hiện câu hỏi liên quan đến dị ứng/kiêng khem
            String norm = removeAccents(originalUserMessage);
            if (hasAllergyOrDietMention(norm)) {
                reply += getAllergySafetyDisclaimer();
            }

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
        String norm = removeAccents(message);
        List<MenuItemEntity> matchedItems = new ArrayList<>();
        String reply;

        // 1. Chào hỏi
        if (isGreetingQuery(norm)) {
            return AiChatResponse.builder()
                    .reply("Dạ em chào quý khách ạ! Rất vui được đón tiếp quý khách tại OmniResto 🍲✨\n\nQuý khách hôm nay đi mấy người, và mình đang muốn tìm món ăn no, món thanh đạm ăn nhẹ hay cần gợi ý theo ngân sách? Em sẵn sàng tư vấn ngay cho mình ạ!")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 2. Ý định Ngân sách & Combo món mặn + nước
        long extractedBudget = extractBudgetFromText(norm);
        boolean wantsCombo = (norm.contains("mon man") || norm.contains("mon an") || norm.contains("com") ||
                norm.contains("banh mi") || norm.contains("pho") || norm.contains("xoi")) &&
                (norm.contains("uong") || norm.contains("nuoc") || norm.contains("tra") || norm.contains("ca phe"));

        if (extractedBudget > 0 || (wantsCombo && (norm.contains("ngan sach") || norm.contains("tien") || norm.contains("k")))) {
            long targetBudget = extractedBudget > 0 ? extractedBudget : 100000;
            boolean isNoSpicy = norm.contains("khong cay") || norm.contains("ko cay") || norm.contains("it cay") || norm.contains("khong an cay");
            boolean mentionsAllergy = hasAllergyOrDietMention(norm);
            boolean isNoSeafood = norm.contains("hai san") || norm.contains("tom") || norm.contains("cua") || norm.contains("ca ") || norm.contains("muc");
            boolean isNoPeanut = norm.contains("dau phong") || norm.contains("lac");

            // ALLERGEN HARD-GATE: Khi khách có yêu cầu dị ứng, BẮT BUỘC món phải có allergenVerified == true!
            List<MenuItemEntity> foods = items.stream()
                    .filter(i -> i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0)
                    .filter(i -> i.getCategory() == null || !removeAccents(i.getCategory().getName()).contains("uong"))
                    .filter(i -> {
                        String nameNorm = removeAccents(i.getName());
                        String descNorm = removeAccents(i.getDescription());
                        String ingNorm = removeAccents(i.getIngredients());
                        String allergenNorm = removeAccents(i.getAllergens());

                        // Hard check cay
                        if (isNoSpicy && i.getSpicyLevel() != null && i.getSpicyLevel() > 0) return false;
                        if (isNoSpicy && (nameNorm.contains("ot") || descNorm.contains("cay") || ingNorm.contains("ot"))) return false;

                        // Hard check dị ứng: Nếu khách dị ứng mà món CHƯA được bếp trưởng verify -> LOẠI THẲNG
                        if (mentionsAllergy && !Boolean.TRUE.equals(i.getAllergenVerified())) {
                            return false;
                        }

                        // Hard check thành phần
                        if (isNoSeafood && (nameNorm.contains("cua") || nameNorm.contains("tom") || nameNorm.contains("ca ") ||
                                nameNorm.contains("hai san") || allergenNorm.contains("seafood") || allergenNorm.contains("hai san"))) {
                            return false;
                        }
                        if (isNoPeanut && (nameNorm.contains("dau phong") || nameNorm.contains("lac") || allergenNorm.contains("peanut"))) {
                            return false;
                        }

                        return true;
                    })
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = items.stream()
                    .filter(i -> i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0)
                    .filter(i -> i.getCategory() != null && removeAccents(i.getCategory().getName()).contains("uong"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            MenuItemEntity bestFood = null;
            MenuItemEntity bestDrink = null;
            long bestPairSum = 0;

            for (MenuItemEntity f : foods) {
                long fPrice = f.getPrice().longValue();
                for (MenuItemEntity d : drinks) {
                    long dPrice = d.getPrice().longValue();
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

                reply = String.format("Dạ với ngân sách **%s đ**, yêu cầu **1 món mặn + 1 đồ uống**, OmniBot xin gợi ý combo tối ưu nhất cho quý khách:\n\n" +
                                "1. 🍲 **Món mặn**: **%s** (%s đ)\n" +
                                "2. 🍹 **Đồ uống**: **%s** (%s đ)\n\n" +
                                "💰 **Tổng cộng**: **%s đ**%s.\n\n" +
                                "Mời quý khách bấm **Thêm giỏ** bên dưới cho cả 2 món để thưởng thức bữa ăn ngon miệng nhé!",
                        String.format("%,d", targetBudget), foodName, foodPrice, drinkName, drinkPrice, totalStr,
                        change > 0 ? String.format(" (vẫn còn dư **%s đ** trong ngân sách)", changeStr) : "");

                if (mentionsAllergy || isNoSpicy) {
                    reply += getAllergySafetyDisclaimer();
                }

                return AiChatResponse.builder()
                        .reply(reply)
                        .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                        .modelUsed("Rule-Based Assistant")
                        .build();
            }
        }

        // 3. Món rẻ nhất / bình dân (Loại bỏ các món có giá <= 0đ)
        boolean isCheapest = norm.contains("re nhat") || norm.contains("it tien") || norm.contains("gia thap") ||
                norm.contains("binh dan") || norm.contains("tiet kiem");

        if (isCheapest) {
            List<MenuItemEntity> foods = items.stream()
                    .filter(i -> i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0)
                    .filter(i -> i.getCategory() == null || !removeAccents(i.getCategory().getName()).contains("uong"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = items.stream()
                    .filter(i -> i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0)
                    .filter(i -> i.getCategory() != null && removeAccents(i.getCategory().getName()).contains("uong"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            MenuItemEntity cheapestFood = !foods.isEmpty() ? foods.get(0) : null;
            MenuItemEntity cheapestDrink = !drinks.isEmpty() ? drinks.get(0) : null;

            if (cheapestFood != null) matchedItems.add(cheapestFood);
            if (cheapestDrink != null) matchedItems.add(cheapestDrink);

            String foodName = cheapestFood != null ? cheapestFood.getName() : "Món ăn";
            String foodPrice = cheapestFood != null ? String.format("%,d", cheapestFood.getPrice().longValue()) : "0";
            String drinkName = cheapestDrink != null ? cheapestDrink.getName() : "Đồ uống";
            String drinkPrice = cheapestDrink != null ? String.format("%,d", cheapestDrink.getPrice().longValue()) : "0";

            reply = String.format("Dạ món ăn có mức giá tiết kiệm và bình dân nhất của quán hiện tại là **%s** chỉ với **%s đ** ạ! 😋\n\nVề thức uống thì có **%s** (%s đ). Toàn bộ món đều được chế biến từ nguyên liệu tươi mới trong ngày. Mời quý khách bấm 'Thêm giỏ' bên dưới để dùng thử nhé!",
                    foodName, foodPrice, drinkName, drinkPrice);

            return AiChatResponse.builder()
                    .reply(reply)
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 4. Món đắt nhất / sang nhất
        boolean isExpensive = norm.contains("dat nhat") || norm.contains("cao cap nhat") || norm.contains("sang nhat") ||
                norm.contains("nhieu tien nhat");

        if (isExpensive) {
            items.stream()
                    .filter(i -> i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0)
                    .sorted((a, b) -> b.getPrice().compareTo(a.getPrice()))
                    .findFirst()
                    .ifPresent(matchedItems::add);

            MenuItemEntity topDish = !matchedItems.isEmpty() ? matchedItems.get(0) : null;
            String name = topDish != null ? topDish.getName() : "";
            String price = topDish != null ? String.format("%,d", topDish.getPrice().longValue()) : "0";

            reply = String.format("Dạ món ăn thượng hạng và đầy đặn nhất của quán là **%s** (%s đ) ạ! 👑✨\n\nĐây là set ăn rất được ưa chuộng cho các bàn tiệc sum vầy hoặc gia đình. Quý khách bấm 'Thêm giỏ' ngay bên dưới để bếp chuẩn bị nhé!",
                    name, price);

            return AiChatResponse.builder()
                    .reply(reply)
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // 5. Món chay / thanh đạm
        if (norm.contains("chay") || norm.contains("thanh dam")) {
            matchedItems = items.stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsVegetarian()) ||
                            removeAccents(i.getName()).contains("chay") ||
                            removeAccents(i.getName()).contains("sen") ||
                            removeAccents(i.getName()).contains("nam"))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ với quý khách dùng món thanh đạm hoặc món chay, bếp OmniResto có các món chế biến từ nếp nương, hạt sen và rau nấm tươi mát. Nếu quý khách có yêu cầu ăn chay nghiêm ngặt, vui lòng báo nhân viên phục vụ để bếp lưu ý chế biến riêng nhé! 🌿✨";
        } else if (norm.contains("khong cay") || norm.contains("ko cay") || norm.contains("tre em") || norm.contains("em be") || norm.contains("be")) {
            matchedItems = items.stream()
                    .filter(i -> (i.getSpicyLevel() == null || i.getSpicyLevel() == 0) &&
                            (removeAccents(i.getName()).contains("pho") ||
                                    removeAccents(i.getName()).contains("com tam") ||
                                    removeAccents(i.getName()).contains("xoi") ||
                                    removeAccents(i.getName()).contains("banh cuon")))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ đây là các món có vị thanh ngọt tự nhiên từ nước hầm xương và không nêm ớt cay. Để phù hợp nhất cho bé hoặc người không ăn được cay, bạn vui lòng dặn thêm nhân viên phục vụ ghi chú không tiêu ớt khi lên món nhé: 👶🍲";
        } else if (norm.contains("nhom") || norm.contains("combo") || norm.contains("gia dinh") || norm.contains("3 nguoi") || norm.contains("4 nguoi") || norm.contains("lau")) {
            matchedItems = items.stream()
                    .filter(i -> removeAccents(i.getName()).contains("lau") ||
                            removeAccents(i.getName()).contains("ga") ||
                            removeAccents(i.getName()).contains("bo") ||
                            removeAccents(i.getName()).contains("tra"))
                    .limit(3)
                    .collect(Collectors.toList());
            reply = "Dạ với nhóm từ 3 đến 4 người, em gợi ý quý khách thưởng thức combo lẩu ấm cúng kèm món ăn kèm và nước trà thanh nhiệt sum vầy ạ! 👨‍👩‍👧‍👦🍲";
        } else if (norm.contains("uong") || norm.contains("nuoc") || norm.contains("tra") || norm.contains("ca phe") || norm.contains("trang mieng")) {
            matchedItems = items.stream()
                    .filter(i -> (i.getCategory() != null && removeAccents(i.getCategory().getName()).contains("uong")) ||
                            removeAccents(i.getName()).contains("tra") ||
                            removeAccents(i.getName()).contains("ca phe"))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ nhà hàng có các loại thức uống pha chế thủ công thanh mát và cà phê đậm đà giúp giải nhiệt và cân bằng khẩu vị cực tốt ạ: 🍹☕";
        } else if (norm.contains("vietqr") || norm.contains("thanh toan") || norm.contains("chuyen khoan")) {
            return AiChatResponse.builder()
                    .reply("Dạ quý khách có thể thanh toán VietQR rất nhanh chóng:\n1. Chọn mục **'Đơn hàng'** trên menu.\n2. Bấm nút **'Quét mã VietQR'**, mã QR động với số tiền chính xác sẽ hiện ra.\n3. Quét trên app ngân hàng bất kỳ, hệ thống sẽ tự động ghi nhận thanh toán sau 2–3 giây ạ! 💳✨")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        } else if (norm.contains("wifi") || norm.contains("mat khau") || norm.contains("pass")) {
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

        if (hasAllergyOrDietMention(norm)) {
            reply += getAllergySafetyDisclaimer();
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

    private boolean hasAllergyOrDietMention(String norm) {
        return norm.contains("di ung") || norm.contains("kieng") || norm.contains("man ngua") ||
                norm.contains("khong cay") || norm.contains("ko cay") || norm.contains("it cay") ||
                norm.contains("hai san") || norm.contains("dau phong") || norm.contains("lac");
    }

    private String getAllergySafetyDisclaimer() {
        return "\n\n⚠️ **Lưu ý an toàn dị ứng**: OmniResto nỗ lực kiểm soát thành phần trong từng món, tuy nhiên trong môi trường chế biến mở vẫn có thể tiềm ẩn nguy cơ nhiễm chéo. Quý khách có tiền sử dị ứng nghiêm trọng vui lòng thông báo trực tiếp với nhân viên phục vụ trước khi lên món để bếp lưu ý chế biến riêng nhé.";
    }

    /**
     * Bóc tách số tiền ngân sách hỗ trợ đa dạng định dạng tiếng Việt:
     * - 1.5 triệu, 1.5tr, 2 triệu, 2tr, 1tr2, 1tr5
     * - 100.000, 100,000, 100k, 100 ngàn, 100 nghìn
     * - 50k, 50000 vnđ
     */
    public static long extractBudgetFromText(String text) {
        if (text == null) return 0;
        String norm = removeAccents(text);

        // 1. Dạng 1tr2, 1tr5
        Matcher mCompound = Pattern.compile("(\\d+)\\s*(?:tr|trieu)\\s*(\\d+)").matcher(norm);
        if (mCompound.find()) {
            try {
                long mil = Long.parseLong(mCompound.group(1));
                String fractional = mCompound.group(2);
                long sub = Long.parseLong(fractional);
                if (fractional.length() == 1) sub *= 100_000;
                else if (fractional.length() == 2) sub *= 10_000;
                return mil * 1_000_000 + sub;
            } catch (Exception ignored) {}
        }

        // 2. Dạng 1.5 triệu, 1,5tr, 2tr, 2 trieu
        Matcher mMillion = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(?:tr|trieu)\\b").matcher(norm);
        if (mMillion.find()) {
            try {
                String valStr = mMillion.group(1).replace(',', '.');
                double milVal = Double.parseDouble(valStr);
                return (long) (milVal * 1_000_000);
            } catch (Exception ignored) {}
        }

        // 3. Dạng 100k, 150 ngàn, 200 nghin
        Matcher mThousand = Pattern.compile("(\\d+)\\s*(?:k|ngan|nghin)\\b").matcher(norm);
        if (mThousand.find()) {
            try {
                return Long.parseLong(mThousand.group(1)) * 1000;
            } catch (Exception ignored) {}
        }

        // 4. Dạng 100.000đ, 100,000 vnđ (có dấu phân cách hàng nghìn)
        Matcher mFormatted = Pattern.compile("\\b(\\d{1,3}(?:[.,]\\d{3})+)\\s*(?:d|vnd)?\\b").matcher(norm);
        if (mFormatted.find()) {
            try {
                String clean = mFormatted.group(1).replaceAll("[.,]", "");
                long val = Long.parseLong(clean);
                if (val >= 1000 && val <= 50_000_000) return val;
            } catch (Exception ignored) {}
        }

        // 5. Dạng số nguyên trần (ví dụ 100000, 50000)
        Matcher mRawNumber = Pattern.compile("\\b(\\d{4,8})\\s*(?:d|vnd)?\\b").matcher(norm);
        if (mRawNumber.find()) {
            try {
                long val = Long.parseLong(mRawNumber.group(1));
                // Loại trừ các năm dương lịch như 2024, 2025, 2026
                if (val >= 10000 && val != 2024 && val != 2025 && val != 2026) return val;
            } catch (Exception ignored) {}
        }

        return 0;
    }

    public static String removeAccents(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase()
                .trim();
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
