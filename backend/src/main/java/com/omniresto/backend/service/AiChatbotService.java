package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.dto.ai.*;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.VoucherRepository;
import com.omniresto.backend.domain.VoucherEntity;
import com.omniresto.backend.helper.MealPeriodHelper;
import com.omniresto.backend.domain.enums.MealPeriod;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiChatbotService {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // =========================================================================
    // STATIC COMPILED PATTERNS (Enterprise Performance & Reusability)
    // =========================================================================
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern EMERGENCY_ALLERGY_PATTERN = Pattern.compile(
            "\\b(soc phan ve|kho tho|cap cuu|nguy hiem|sung phu|di ung nang|ngat tho|goi 115|di vien)\\b");
    private static final Pattern VEGETARIAN_PATTERN = Pattern.compile(
            "(?<!\\bban\\s)\\b(an chay|mon chay|thuan chay|chay)\\b");
    private static final Pattern ALLERGY_NEGATION_PATTERN = Pattern.compile(
            "\\b(khong|ko|chua|khong con|het|khong bi|ko bi|chua tung|chua bao gio)\\s+(?:he\\s+)?(?:bi\\s+)?(?:di ung|kieng|so|di ung voi)\\s+([^.?!,;]+)");
    private static final Pattern ALLERGY_RESTRICTION_CLAUSE_PATTERN = Pattern.compile(
            "\\b(di ung|kieng|khong an duoc|ko an duoc|khong an|ko an|tranh|man ngua|so bi)\\b(?:\\s+(?:voi|ve|cac|mon|do|thuc pham))?\\s*[:]?\\s*([^.?!;]+)");
    private static final Pattern PARTY_SIZE_NUM_PATTERN = Pattern.compile(
            "(?<!\\d)\\b([1-9]|10)\\s*(?:nguoi|ban|khach|dua)\\b");
    private static final Pattern DISH_PRICE_QUERY_PATTERN = Pattern.compile(
            "\\b(gia bao nhieu|bao nhieu tien|bao tien|gia ca|gia tien|muc gia|co gia|bao nhieu 1|1 to|1 phan|1 dia|1 ly|1 bat)\\b");
    private static final Pattern DRINK_QUERY_PATTERN = Pattern.compile(
            "\\b(do uong|thuc uong|nuoc uong|uong gi|uong nuoc|giai khat|nuoc ngot|nuoc suoi|tra da|ca phe|tra sua|sinh to|nuoc ep|cocktail|mocktail|bia|ruou|trang mieng)\\b");
    private static final Pattern DRINK_FALLBACK_PATTERN = Pattern.compile(
            "\\b(uong|nuoc|tra)\\b");
    private static final Pattern PRICE_WORD_PATTERN = Pattern.compile(
            "\\bgia\\b(?!\\s+(dinh|vi|tri|re|tang|giam|nhap|thanh))");

    private final MenuItemRepository menuItemRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    // Dedicated executor for streaming chat (prevents ForkJoinPool commonPool starvation and isolates SSE work)
    private final java.util.concurrent.ExecutorService chatStreamExecutor = java.util.concurrent.Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ai-chatbot-stream");
        t.setDaemon(true);
        return t;
    });

    @Autowired(required = false)
    private VoucherRepository voucherRepository;

    @Setter
    private Clock clock = Clock.system(DEFAULT_ZONE);

    @Setter
    @Value("${restaurant.business-hours.enforce:true}")
    private boolean enforceBusinessHours = true;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.6-flash}")
    private String geminiModel;

    @Value("${gemini.fallback-models:gemini-3.6-flash,gemini-3-flash-preview,gemini-3.8-flash,gemini-2.5-flash,gemini-1.5-flash}")
    private String geminiFallbackModels;

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

    public LocalTime getCurrentTime() {
        return LocalTime.now(clock);
    }

    public boolean isDishAvailableNow(MenuItemEntity item) {
        if (item == null) return false;
        if (!enforceBusinessHours) return true;
        return MealPeriodHelper.isAvailableNow(item.getMealPeriods(), getCurrentTime());
    }

    public AiChatbotService(MenuItemRepository menuItemRepository, ObjectMapper objectMapper) {
        this.menuItemRepository = menuItemRepository;
        this.objectMapper = objectMapper;

        // Configure fast timeouts: 2.5s connect, 10s read to accommodate LLM complex JSON generation
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2500);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public AiChatResponse chat(AiChatRequest request) {
        String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        userMessage = fixMojibakeIfPresent(userMessage);
        if (userMessage.isEmpty()) {
            return AiChatResponse.builder()
                    .reply("Dạ chào bạn! OmniBot có thể giúp gì cho bữa ăn hôm nay của bạn ạ? Bạn có thể hỏi về món bán chạy, món thanh đạm, hoặc gợi ý combo theo ngân sách nhé!")
                    .recommendedDishes(Collections.emptyList())
                    .build();
        }

        // 1. Lấy danh sách món ăn đang phục vụ (có cache snapshot 60s)
        List<MenuItemEntity> availableItems = getAvailableMenuItems();
        Map<String, MenuItemEntity> itemMap = availableItems.stream()
                .collect(Collectors.toMap(MenuItemEntity::getId, item -> item, (a, b) -> a));

        String norm = removeAccents(userMessage);
        log.debug("🤖 [AI-CHAT] Processing query (length={})", userMessage.length());

        // 0. CẢNH BÁO Y TẾ KHẨN CẤP (EMERGENCY MEDICAL HAND-OFF)
        if (isEmergencyMedicalQuery(norm)) {
            return handleEmergencyMedicalHandOff();
        }

        AllergyProfile profile = detectAllergyProfile(norm, request != null ? request.getHistory() : null);

        // 2. KIỂM TRA THÀNH PHẦN / DỊ ỨNG CỦA MÓN ĂN CỤ THỂ (Dish Allergen & Ingredient Inspection)
        if (isDishIngredientCheckQuery(norm)) {
            return handleDishIngredientCheck(userMessage, norm, request != null ? request.getHistory() : null, availableItems, profile);
        }

        // 3. HỎI BẤT KỲ THÔNG TIN NÀO VỀ MÓN ĂN (Dish Entity Inquiry Engine)
        if (isDishInquiryQuery(norm, availableItems, request != null ? request.getHistory() : null)) {
            return handleDishInquiry(userMessage, norm, request != null ? request.getHistory() : null, availableItems);
        }

        // 4. PHÂN LUỒNG THEO Ý ĐỊNH (Intent-based Routing):
        // Các câu hỏi tính toán thuần túy, cực trị, tiện ích đi thẳng vào server solver
        if (isDeterministicQuery(norm)) {
            return generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
        }

        // 4. Các câu hỏi mở (sở thích, không khí hẹn hò, lãng mạn, hương vị):
        if (isGeminiConfigured()) {
            try {
                AiChatResponse geminiResponse = callGeminiApi(userMessage, request.getHistory(), availableItems, itemMap, request);
                if (geminiResponse != null && geminiResponse.getReply() != null && !geminiResponse.getReply().trim().isEmpty()) {
                    return geminiResponse;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed: {}. Falling back to Rule-based assistant.", e.getMessage());
            }
        }

        // 5. Fallback an toàn nếu LLM không khả dụng hoặc lỗi
        return generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
    }

    public void streamChat(AiChatRequest request, SseEmitter emitter) {
        emitter.onTimeout(() -> {
            log.debug("SSE emitter timed out");
            try { emitter.complete(); } catch (Exception ignored) {}
        });
        emitter.onError(e -> {
            log.debug("SSE emitter error: {}", e.getMessage());
        });
        emitter.onCompletion(() -> {
            log.debug("SSE emitter completed successfully");
        });

        chatStreamExecutor.execute(() -> {
            try {
                String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
                userMessage = fixMojibakeIfPresent(userMessage);
                if (userMessage.isEmpty()) {
                    sendTokens("Dạ chào bạn! OmniBot có thể giúp gì cho bữa ăn hôm nay của bạn ạ? Bạn có thể hỏi về món bán chạy, món thanh đạm, hoặc gợi ý combo theo ngân sách nhé!", emitter);
                    emitter.send(SseEmitter.event().name("done").data(Map.of("model", "Rule-Based Assistant")));
                    emitter.complete();
                    return;
                }

                String norm = removeAccents(userMessage);

                // 0. CẢNH BÁO Y TẾ KHẨN CẤP (EMERGENCY MEDICAL HAND-OFF)
                if (isEmergencyMedicalQuery(norm)) {
                    AiChatResponse emergencyResp = handleEmergencyMedicalHandOff();
                    sendTokens(emergencyResp.getReply(), emitter);
                    emitter.send(SseEmitter.event().name("done").data(Map.of("model", emergencyResp.getModelUsed())));
                    emitter.complete();
                    return;
                }

                List<MenuItemEntity> availableItems = getAvailableMenuItems();
                Map<String, MenuItemEntity> itemMap = availableItems.stream()
                        .collect(Collectors.toMap(MenuItemEntity::getId, item -> item, (a, b) -> a));

                AllergyProfile profile = detectAllergyProfile(norm, request != null ? request.getHistory() : null);

                AiChatResponse response;
                if (isDishIngredientCheckQuery(norm)) {
                    response = handleDishIngredientCheck(userMessage, norm, request != null ? request.getHistory() : null, availableItems, profile);
                } else if (isDishInquiryQuery(norm, availableItems, request != null ? request.getHistory() : null)) {
                    response = handleDishInquiry(userMessage, norm, request != null ? request.getHistory() : null, availableItems);
                } else if (isDeterministicQuery(norm)) {
                    response = generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
                } else if (isGeminiConfigured()) {
                    try {
                        response = callGeminiApi(userMessage, request != null ? request.getHistory() : null, availableItems, itemMap, request);
                        if (response == null || response.getReply() == null || response.getReply().trim().isEmpty()) {
                            response = generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
                        }
                    } catch (Exception e) {
                        log.warn("Gemini API call failed during streaming: {}. Falling back to Rule-based assistant.", e.getMessage());
                        response = generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
                    }
                } else {
                    response = generateRuleBasedResponse(userMessage, availableItems, request != null ? request.getHistory() : null);
                }

                if (response != null && response.getReply() != null) {
                    sendTokens(response.getReply(), emitter);
                }

                if (response != null && response.getRecommendedDishes() != null && !response.getRecommendedDishes().isEmpty()) {
                    emitter.send(SseEmitter.event().name("dishes").data(response.getRecommendedDishes()));
                }

                String modelUsed = response != null && response.getModelUsed() != null ? response.getModelUsed() : "Rule-Based Assistant";
                emitter.send(SseEmitter.event().name("done").data(Map.of("model", modelUsed)));
                emitter.complete();
            } catch (Exception e) {
                log.error("Streaming chat encountered an error", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of("message", "Đã xảy ra lỗi trong quá trình xử lý phản hồi.")));
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        });
    }

    private void sendTokens(String text, SseEmitter emitter) {
        if (text == null || text.isEmpty()) return;
        String[] tokens = text.split("(?<=\\s)|(?<=\\n)");
        StringBuilder batch = new StringBuilder();
        for (int i = 0; i < tokens.length; i++) {
            batch.append(tokens[i]);
            if (batch.length() >= 12 || i == tokens.length - 1 || tokens[i].contains("\n")) {
                try {
                    emitter.send(SseEmitter.event().name("chunk").data(Map.of("content", batch.toString())));
                    batch.setLength(0);
                    Thread.sleep(12);
                } catch (Exception ex) {
                    log.debug("Client disconnected while streaming: {}", ex.getMessage());
                    break;
                }
            }
        }
    }

    private List<MenuItemEntity> getAvailableMenuItems() {
        long now = System.currentTimeMillis();
        List<MenuItemEntity> cached = cachedAvailableItems;
        if (cached != null && !cached.isEmpty() && (now - cacheTimestamp < CACHE_TTL_MS)) {
            return cached;
        }
        List<MenuItemEntity> items = Collections.emptyList();
        try {
            items = menuItemRepository.findByStatusWithCategory(MenuStatus.available);
        } catch (Exception e) {
            log.warn("findByStatusWithCategory failed ({}), falling back to findByStatus", e.getMessage());
        }
        if (items.isEmpty()) {
            try {
                items = menuItemRepository.findByStatus(MenuStatus.available);
            } catch (Exception e) {
                log.warn("findByStatus failed ({})", e.getMessage());
            }
        }
        if (items.isEmpty()) {
            try {
                List<MenuItemEntity> all = menuItemRepository.findAllWithCategory();
                if (all.isEmpty()) all = menuItemRepository.findAll();
                items = all.stream().filter(i -> i.getStatus() == MenuStatus.available).collect(Collectors.toList());
                if (items.isEmpty()) items = all;
            } catch (Exception e) {
                log.warn("findAll fallback failed ({})", e.getMessage());
            }
        }
        if (!items.isEmpty()) {
            cachedAvailableItems = items;
            cacheTimestamp = now;
        }
        return items;
    }

    public void clearCache() {
        this.cachedAvailableItems = null;
        this.cacheTimestamp = 0;
    }

    public static String getCategoryNameSafe(MenuItemEntity item) {
        if (item == null) return "";
        try {
            if (item.getCategory() != null) {
                String catName = item.getCategory().getName();
                return catName != null ? catName : "";
            }
        } catch (Exception ignored) {}
        return "";
    }

    public static class AllergyProfile {
        public boolean noChicken = false;
        public boolean noSeafood = false;
        public boolean noBeef = false;
        public boolean noPork = false;
        public boolean noPeanut = false;
        public boolean noEgg = false;
        public boolean noMilk = false;
        public boolean noSpicy = false;
        public boolean isVegetarian = false;

        public boolean hasAnyRestriction() {
            return noChicken || noSeafood || noBeef || noPork || noPeanut || noEgg || noMilk || noSpicy || isVegetarian;
        }

        public List<String> getMentionedAllergens() {
            List<String> list = new ArrayList<>();
            if (noChicken) list.add("thịt gà");
            if (noSeafood) list.add("hải sản (tôm, cua, cá, mực)");
            if (noBeef) list.add("thịt bò");
            if (noPork) list.add("thịt heo");
            if (noPeanut) list.add("đậu phộng / lạc");
            if (noEgg) list.add("trứng");
            if (noMilk) list.add("sữa / phô mai");
            if (noSpicy) list.add("đồ cay");
            if (isVegetarian) list.add("món mặn (ăn chay)");
            return list;
        }
    }

    public static boolean isEmergencyMedicalQuery(String norm) {
        if (norm == null || norm.isEmpty()) return false;
        return EMERGENCY_ALLERGY_PATTERN.matcher(norm).find();
    }

    private AiChatResponse handleEmergencyMedicalHandOff() {
        String reply = "🚨 **CẢNH BÁO Y TẾ KHẨN CẤP**: Quý khách đang đề cập đến dấu hiệu dị ứng nghiêm trọng / khó thở / sốc phản vệ.\n\n"
                + "⚠️ **VUI LÒNG NGỪNG DÙNG BỮA NGAY LẬP TỨC!**\n"
                + "1. Hãy thông báo ngay lập tức cho nhân viên phục vụ hoặc Quản lý nhà hàng tại quầy để được trợ giúp y tế khẩn cấp.\n"
                + "2. Gọi cấp cứu **115** hoặc đến cơ sở y tế gần nhất nếu có biểu hiện khó thở, sưng phù môi mắt hoặc chóng mặt.\n"
                + "3. Hotline hỗ trợ khẩn cấp của OmniResto: **1900 6868**.\n\n"
                + "_OmniBot đã tạm dừng toàn bộ tư vấn thực đơn để ưu tiên an toàn sức khỏe và tính mạng của quý khách._";

        return AiChatResponse.builder()
                .reply(reply)
                .recommendedDishes(Collections.emptyList())
                .modelUsed("Emergency-Medical-Hand-off")
                .build();
    }

    private static boolean isNegatedForAlias(String norm, String alias) {
        if (norm == null || norm.isEmpty()) return false;
        Matcher m = ALLERGY_NEGATION_PATTERN.matcher(norm);
        while (m.find()) {
            String negatedScope = m.group(2).toLowerCase();
            if (containsWordOrAlias(negatedScope, alias)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsWordOrAlias(String text, String alias) {
        if (text == null || text.isEmpty()) return false;
        String trimmed = alias.trim();
        String regex = "\\b" + Pattern.quote(trimmed) + "\\b";
        return Pattern.compile(regex).matcher(text).find();
    }

    private static boolean startsWithWordOrAlias(String text, String alias) {
        if (text == null || text.isEmpty()) return false;
        String trimmed = alias.trim();
        String regex = "^" + Pattern.quote(trimmed) + "\\b";
        return Pattern.compile(regex).matcher(text.trim()).find();
    }

    private static boolean hasAllergenRestriction(String norm, String... aliases) {
        if (norm == null || norm.isEmpty()) return false;

        for (String a : aliases) {
            // Kiểm tra xem thành phần này có nằm trong mệnh đề phủ định không (ví dụ: "tôi không dị ứng hải sản")
            if (isNegatedForAlias(norm, a)) {
                continue;
            }

            // 1. Kiểm tra trực tiếp các cụm từ kết hợp rõ ràng:
            String[] prefixes = {"di ung ", "kieng ", "khong an ", "ko an ", "tranh ", "khong an duoc ", "ko an duoc ", "so bi di ung ", "so bi ", "man ngua khi an ", "man ngua vi "};
            for (String prefix : prefixes) {
                int idx = norm.indexOf(prefix);
                while (idx != -1) {
                    String before = norm.substring(0, idx).trim();
                    boolean negatedPrefix = before.endsWith("khong") || before.endsWith("ko") || before.endsWith("chua") || before.endsWith("het");
                    if (!negatedPrefix) {
                        String after = norm.substring(idx + prefix.length());
                        if (startsWithWordOrAlias(after, a)) {
                            return true;
                        }
                    }
                    idx = norm.indexOf(prefix, idx + 1);
                }
            }

            // 2. Mẫu câu hỏi thành phần: "co <alias> khong ... di ung", "co chua <alias> khong ... di ung"
            String pCo = "co " + a;
            String pChua = "chua " + a;
            if ((norm.contains(pCo) || norm.contains(pChua)) &&
                (norm.contains("di ung") || norm.contains("kieng") || norm.contains("man ngua"))) {
                if (norm.contains(pCo + " khong") || norm.contains(pCo + " ko") ||
                    norm.contains(pChua + " khong") || norm.contains(pChua + " ko") ||
                    norm.contains(pCo + " hay") || norm.contains(pChua + " hay")) {
                    return true;
                }
            }

            // 3. Mệnh đề liệt kê sau từ khóa dị ứng: "di ung: ga, hai san", "di ung voi hai san, thit ga"
            Matcher m = ALLERGY_RESTRICTION_CLAUSE_PATTERN.matcher(norm);
            while (m.find()) {
                String clause = m.group(2).toLowerCase();
                if (containsWordOrAlias(clause, a)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static AllergyProfile detectAllergyProfile(String norm) {
        return detectAllergyProfile(norm, null);
    }

    public static AllergyProfile detectAllergyProfile(String norm, List<ChatMessageDto> history) {
        AllergyProfile profile = new AllergyProfile();
        if (norm == null) norm = "";

        // Combine text from history (only user turns) for Cross-Turn Memory
        StringBuilder combinedText = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            for (ChatMessageDto msg : history) {
                if (msg != null && "user".equalsIgnoreCase(msg.getRole()) && msg.getContent() != null) {
                    combinedText.append(removeAccents(msg.getContent())).append(". ");
                }
            }
        }
        combinedText.append(norm);
        String fullNorm = combinedText.toString();

        // 1. Gà
        profile.noChicken = hasAllergenRestriction(fullNorm, "ga", "thit ga", "ga ta", "ga doi", "canh ga", "dui ga");

        // 2. Hải sản (tôm, cua, cá, mực, ốc, nghêu, sò, mắm tôm, mắm ruốc...)
        profile.noSeafood = hasAllergenRestriction(fullNorm, "hai san", "tom", "cua", "ca", "muc", "oc", "ngheu", "ngao", "so", "hau", "mam tom", "mam ruoc", "mam nem", "seafood");

        // 3. Đậu phộng / Lạc
        profile.noPeanut = hasAllergenRestriction(fullNorm, "dau phong", "lac", "peanut", "hat dieu");

        // 4. Thịt bò
        profile.noBeef = hasAllergenRestriction(fullNorm, "bo", "thit bo", "bap bo", "beef", "wagyu");

        // 5. Thịt heo
        profile.noPork = hasAllergenRestriction(fullNorm, "heo", "thit heo", "lon", "thit lon", "pork");

        // 6. Trứng
        profile.noEgg = hasAllergenRestriction(fullNorm, "trung", "hot ga", "hot vit", "egg");

        // 7. Sữa / Phô mai
        profile.noMilk = hasAllergenRestriction(fullNorm, "sua", "pho mai", "cheese", "milk", "kem");

        // 8. Không ăn cay
        if (fullNorm.contains("khong cay") || fullNorm.contains("ko cay") || fullNorm.contains("it cay") ||
                fullNorm.contains("khong an cay") || fullNorm.contains("tre em") || fullNorm.contains("em be") ||
                fullNorm.contains("ko an duoc cay") || fullNorm.contains("khong an duoc cay")) {
            profile.noSpicy = true;
        }

        // 9. Ăn chay: Bắt buộc dùng regex loại trừ 'ban chay' (bán chạy)
        if (VEGETARIAN_PATTERN.matcher(fullNorm).find()) {
            profile.isVegetarian = true;
        }

        return profile;
    }

    public static int detectPartySize(String norm) {
        if (norm == null || norm.isEmpty()) return 0;

        // 1. Dạng rõ ràng kèm số người / bạn / khách (không bị lẫn với 300k, 2.4 triệu)
        Matcher m = PARTY_SIZE_NUM_PATTERN.matcher(norm);
        if (m.find()) {
            try {
                int size = Integer.parseInt(m.group(1));
                if (size >= 1 && size <= 10) {
                    return size;
                }
            } catch (Exception ignored) {}
        }

        // 2. Chữ số bằng lời: "mot nguoi" -> 1, "hai nguoi" -> 2, "ba nguoi" -> 3, "bon nguoi" -> 4, "nam nguoi" -> 5, "sau nguoi" -> 6
        if (norm.contains("mot nguoi") || norm.contains("1 minh") || norm.contains("mot minh") || norm.contains("an don")) {
            return 1;
        }
        if (norm.contains("hai nguoi") || norm.contains("hai ban") || norm.contains("hai khach") || norm.contains("hai dua") ||
            norm.contains("di 2") || norm.contains("cho 2") || norm.contains("set 2") || norm.contains("combo 2") ||
            norm.contains("1 nguoi nua") || norm.contains("mot nguoi nua") || norm.contains("di voi 1 nguoi") || norm.contains("di cung 1 nguoi")) {
            return 2;
        }
        if (norm.contains("ba nguoi") || norm.contains("ba ban") || norm.contains("ba khach") || norm.contains("ba dua")) {
            return 3;
        }
        if (norm.contains("bon nguoi") || norm.contains("bon ban") || norm.contains("bon khach") || norm.contains("bon dua")) {
            return 4;
        }
        if (norm.contains("nam nguoi") || norm.contains("nam ban") || norm.contains("nam khach")) {
            return 5;
        }
        if (norm.contains("sau nguoi") || norm.contains("sau ban") || norm.contains("sau khach")) {
            return 6;
        }

        // 3. Quy mô theo nhóm / gia đình:
        if (norm.contains("gia dinh") || norm.contains("nhom nho")) {
            return 4;
        }
        if (norm.contains("nhom dong") || norm.contains("cong ty") || norm.contains("tiec")) {
            return 6;
        }

        // 4. Hẹn hò lãng mạn mặc định là 2 người (KHÔNG bị chặn bởi 300k hay 2.4 triệu!)
        boolean isDateVibe = norm.contains("hen ho") || norm.contains("ban gai") || norm.contains("nguoi yeu") ||
                norm.contains("cap doi") || norm.contains("lang man");
        if (isDateVibe) {
            return 2;
        }

        return 0;
    }

    /**
     * Phát hiện ý định hỏi về voucher / mã giảm giá / khuyến mãi
     */
    public static boolean detectVoucherIntent(String norm) {
        if (norm == null) return false;
        return norm.contains("voucher") || norm.contains("giam gia") || norm.contains("khuyen mai") ||
                norm.contains("ma giam") || norm.contains("coupon") || norm.contains("uu dai") ||
                norm.contains("discount") || norm.contains("sale") || norm.contains("promo") ||
                norm.contains("ma uu dai") || norm.contains("qua tang") || norm.contains("giam toi da");
    }

    /**
     * Phát hiện ý định hỏi về phương thức thanh toán
     */
    public static boolean detectPaymentIntent(String norm) {
        if (norm == null) return false;
        return norm.contains("thanh toan") || norm.contains("vietqr") || norm.contains("chuyen khoan") ||
                norm.contains("quet ma") || norm.contains("qr code") || norm.contains("tien mat") ||
                norm.contains("the tin dung") || norm.contains("the atm") || norm.contains("momo") ||
                norm.contains("vnpay") || norm.contains("zalopay") || norm.contains("online") ||
                norm.contains("phuong thuc") || norm.contains("pp thanh toan") ||
                norm.contains("tra tien") || norm.contains("pay");
    }

    /**
     * Kiểm tra chính xác câu hỏi về đồ uống, tránh bắt nhầm 'phương thức', 'trả tiền', 'kiểm tra'
     */
    private boolean isDrinkQuery(String norm) {
        if (norm == null || norm.isEmpty()) return false;
        if (norm.contains("phuong thuc") || norm.contains("tra tien") || norm.contains("kiem tra") || norm.contains("doi tra")) {
            return false;
        }
        return DRINK_QUERY_PATTERN.matcher(norm).find()
                || (DRINK_FALLBACK_PATTERN.matcher(norm).find() && !norm.contains("phuong thuc") && !norm.contains("tra tien") && !norm.contains("kiem tra"));
    }

    private static boolean containsFishWord(String text) {
        if (text == null) return false;
        Matcher m = Pattern.compile("\\bca\\b").matcher(text);
        while (m.find()) {
            int end = m.end();
            String after = text.substring(end).trim();
            if (after.startsWith("phe") || after.startsWith("chua") || after.startsWith("tim") || after.startsWith("cao")) {
                continue;
            }
            return true;
        }
        return false;
    }

    private static boolean containsClamWord(String text) {
        if (text == null) return false;
        Matcher m = Pattern.compile("\\bso\\b").matcher(text);
        while (m.find()) {
            int end = m.end();
            String after = text.substring(end).trim();
            if (after.startsWith("co la") || after.startsWith("cola")) {
                continue;
            }
            return true;
        }
        return false;
    }

    private static boolean containsPeanutWord(String text) {
        if (text == null) return false;
        Matcher m = Pattern.compile("\\blac\\b").matcher(text);
        while (m.find()) {
            int start = m.start();
            if (start >= 1 && text.charAt(start - 1) == 'b') {
                continue; // black
            }
            int end = m.end();
            String after = text.substring(end).trim();
            if (after.startsWith("tay") || after.startsWith("dau")) {
                continue;
            }
            return true;
        }
        return false;
    }

    private boolean isDishSafeForProfile(MenuItemEntity item, AllergyProfile profile) {
        if (item == null) return false;
        if (item.getPrice() == null || item.getPrice().compareTo(BigDecimal.ZERO) <= 0) return false;

        String name = removeAccents(item.getName());
        String desc = removeAccents(item.getDescription());
        String ing = removeAccents(item.getIngredients());
        String allergen = removeAccents(item.getAllergens());
        String cat = removeAccents(getCategoryNameSafe(item));

        String all = (name + " " + desc + " " + ing + " " + allergen + " " + cat).toLowerCase();

        // 0. FAIL-CLOSED ZERO-TRUST POLICY:
        // Nếu món không có tên hoặc toàn bộ nội dung rỗng/chỉ có category -> loại bỏ ngay
        if (name == null || name.isBlank() || all.replace(cat, "").trim().isEmpty()) {
            return false;
        }

        // 1. Chay
        if (profile.isVegetarian) {
            if (!Boolean.TRUE.equals(item.getIsVegetarian()) && !cat.contains("chay") && !name.contains("chay")) {
                return false;
            }
        }

        // 2. Không cay
        if (profile.noSpicy) {
            if (item.getSpicyLevel() != null && item.getSpicyLevel() > 0) return false;
            if (all.contains("ot ") || all.contains("cay") || all.contains("tieu xanh")) return false;
        }

        // 3. Không gà (kèm gà ẩn: nước dùng gà, bột nêm gà, mỡ gà, lòng gà, gà nướng...)
        if (profile.noChicken) {
            boolean isMushroomOnly = (name.contains("nam dui ga") || desc.contains("nam dui ga")) &&
                    !all.contains("thit ga") && !all.contains("ga ta") && !all.contains("ga doi") && !all.contains("xuong ga");
            if (!isMushroomOnly) {
                if (all.contains("ga ta") || all.contains("ga doi") || all.contains("thit ga") ||
                        all.contains("xoi ga") || all.contains("pho ga") || all.contains("dui ga") ||
                        all.contains("canh ga") || all.contains("uong ga") || all.contains("mo ga") ||
                        all.contains("ruoc ga") || all.contains("xuong ga") || all.contains("nuoc dung ga") ||
                        all.contains("bot nem ga") || all.contains("cot ga") || all.contains("sot ga") ||
                        all.contains("ga nuong") || all.contains("ga ran") ||
                        Pattern.compile("\\bga\\b").matcher(all).find()) {
                    return false;
                }
            }
        }

        // 4. Không hải sản (kèm hải sản ẩn: nước mắm, dầu hào, mắm ruốc, mắm tôm, mắm nêm, cá cơm, nước dùng cá...)
        if (profile.noSeafood) {
            if (cat.contains("hai san") || all.contains("hai san") || all.contains("seafood") ||
                    all.contains("tom") || all.contains("cua") || all.contains("muc") ||
                    all.contains("ca bieu") || all.contains("ca bong") || all.contains("ca com") ||
                    all.contains("mam tom") || all.contains("mam ruoc") || all.contains("mam nem") ||
                    all.contains("giap xac") || all.contains("ngheu") || all.contains("ngao") ||
                    all.contains("nuoc dung ca") || all.contains("sot hai san") || all.contains("bot tom") ||
                    all.contains("tep") || all.contains("surimi") || all.contains("dau hao") ||
                    allergen.contains("hai san") || allergen.contains("cua") || allergen.contains("tom")) {
                return false;
            }
            if (containsFishWord(all)) {
                return false;
            }
            if (containsClamWord(all)) {
                return false;
            }
            if (Pattern.compile("\\bhau\\b").matcher(all).find()) {
                return false;
            }
        }

        // 5. Không đậu phộng / lạc (kèm ẩn: dầu lạc, bơ đậu phộng, hạt điều, dầu mè...)
        if (profile.noPeanut) {
            if (all.contains("dau phong") || all.contains("peanut") || all.contains("hat dieu") ||
                    all.contains("bo dau phong") || allergen.contains("dau phong") || allergen.contains("peanut")) {
                return false;
            }
            if (containsPeanutWord(all)) {
                return false;
            }
        }

        // 6. Không bò (kèm bò ẩn: nước dùng bò, bột nêm bò, sốt bò, mỡ bò...)
        if (profile.noBeef) {
            if (all.contains("thit bo") || all.contains("bap bo") || all.contains("wagyu") ||
                    all.contains("bo to") || all.contains("tai nam") || all.contains("nuoc dung bo") ||
                    all.contains("cot bo") || all.contains("bot nem bo") || all.contains("mo bo") ||
                    Pattern.compile("\\bbo\\b").matcher(all).find()) {
                if (!all.contains("bo bo") && !all.contains("trai bo") && !all.contains("sinh to bo")) {
                    return false;
                }
            }
        }

        // 7. Không heo (kèm heo ẩn: nước dùng heo, tóp mỡ, mỡ heo, gelatin...)
        if (profile.noPork) {
            if (all.contains("heo") || all.contains("suon non") || all.contains("thit ba chi") ||
                    all.contains("gio heo") || all.contains("cha lua") || all.contains("cha que") ||
                    all.contains("cot let") || all.contains("top mo") || all.contains("mo heo") ||
                    all.contains("nuoc dung heo") || all.contains("nuoc ham xuong") ||
                    Pattern.compile("\\b(lon|thit lon|pork)\\b").matcher(all).find()) {
                return false;
            }
        }

        // 8. Không trứng (kèm trứng ẩn: sốt trứng, mayonnaise, lòng đỏ, lòng trắng...)
        if (profile.noEgg) {
            if (all.contains("trung") || all.contains("op la") || all.contains("flan") ||
                    all.contains("mayonnaise") || all.contains("long do") || all.contains("long trang") ||
                    allergen.contains("trung")) {
                return false;
            }
        }

        // 9. Không sữa (kèm sữa ẩn: phô mai, cheese, macchiato, bơ sữa, kem muối...)
        if (profile.noMilk) {
            if (all.contains("sua") || all.contains("macchiato") || all.contains("pho mai") ||
                    all.contains("kem muoi") || all.contains("cheese") || all.contains("butter") ||
                    allergen.contains("sua")) {
                return false;
            }
        }

        return true;
    }

    private boolean isDeterministicQuery(String norm) {
        if (isGreetingQuery(norm)) return true;

        // Nếu câu hỏi mang ngữ cảnh phong phú (hẹn hò, lãng mạn, sinh nhật, không khí...)
        // -> KHÔNG đẩy vào rule-based thô sơ, hãy để LLM xử lý gợi ý phù hợp vibe
        if (isRichVibeQuery(norm)) {
            return false;
        }

        // Ưu tiên an toàn thực phẩm: Các câu hỏi dị ứng/kiêng khem cần thuật toán lọc cứng (deterministic hard filter)
        AllergyProfile profile = detectAllergyProfile(norm);
        if (profile.hasAnyRestriction() && (norm.contains("di ung") || norm.contains("kieng") ||
                norm.contains("khong an") || norm.contains("ko an") || norm.contains("man ngua") ||
                norm.contains("tranh") || norm.contains("so bi"))) {
            return true;
        }

        // Câu hỏi theo quy mô bàn 2 người đơn thuần (không kèm vibe lãng mạn phức tạp)
        int partySize = detectPartySize(norm);
        if (partySize == 2 && (norm.contains("an gi") || norm.contains("mon gi") || norm.contains("phu hop") ||
                norm.contains("goi y") || norm.contains("menu") || norm.contains("thuc don") || norm.contains("an mon"))) {
            return true;
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

        // Danh mục món ăn cụ thể (Lẩu, Phở, Cơm, Bún, Bánh mì, Đồ uống)
        if (norm.contains("lau") || (norm.contains("pho") && !norm.contains("pho mai")) ||
                (norm.contains("com") && !norm.contains("combo")) || norm.contains("bun") ||
                norm.contains("banh mi") || isDrinkQuery(norm)) {
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

    private boolean isGeminiConfigured() {
        if (geminiApiKey == null) return false;
        String key = geminiApiKey.trim();
        return !key.isEmpty() && (key.startsWith("AIzaSy") || key.startsWith("AQ.")) && key.length() >= 25;
    }

    private AiChatResponse callGeminiApi(String userMessage, List<ChatMessageDto> history,
                                         List<MenuItemEntity> availableItems,
                                         Map<String, MenuItemEntity> itemMap) {
        return callGeminiApi(userMessage, history, availableItems, itemMap, null);
    }

    private AiChatResponse callGeminiApi(String userMessage, List<ChatMessageDto> history,
                                         List<MenuItemEntity> availableItems,
                                         Map<String, MenuItemEntity> itemMap,
                                         AiChatRequest request) {
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
                node.put("cat", getCategoryNameSafe(item));
                node.put("desc", item.getDescription() != null ? item.getDescription() : "");
                node.put("veg", Boolean.TRUE.equals(item.getIsVegetarian()));
                node.put("spicy", item.getSpicyLevel() != null ? item.getSpicyLevel() : 0);
                if (item.getAllergens() != null) {
                    node.put("allergens", item.getAllergens());
                }
                node.put("allergenVerified", Boolean.TRUE.equals(item.getAllergenVerified()));
            }
            String compactMenuJson = objectMapper.writeValueAsString(menuArray);

            StringBuilder contextHeader = new StringBuilder();
            if (request != null) {
                if (request.getTableNo() != null && !request.getTableNo().trim().isEmpty()) {
                    String safeTable = request.getTableNo().replaceAll("[^a-zA-Z0-9_-]", "").trim();
                    if (!safeTable.isEmpty()) {
                        contextHeader.append("- Bàn phục vụ: Bàn ").append(safeTable).append("\n");
                    }
                }
                if (request.getCustomerName() != null && !request.getCustomerName().trim().isEmpty()) {
                    String safeName = request.getCustomerName().replaceAll("[\\r\\n\\t]", " ")
                            .replaceAll("[^\\p{L}\\p{N}\\s._-]", "").trim();
                    if (safeName.length() > 30) safeName = safeName.substring(0, 30);
                    if (!safeName.isEmpty()) {
                        contextHeader.append("- Tên khách hàng: ").append(safeName).append("\n");
                    }
                }
                if (request.getMemberTier() != null && !request.getMemberTier().trim().isEmpty()) {
                    String safeTier = request.getMemberTier().replaceAll("[^a-zA-Z0-9_ -]", "").trim();
                    if (!safeTier.isEmpty()) {
                        contextHeader.append("- Hạng thành viên: ").append(safeTier).append(" (chào hỏi trân trọng, tư vấn phù hợp với đẳng cấp).\n");
                    }
                }
            }

            AllergyProfile detectedProfile = detectAllergyProfile(removeAccents(userMessage), history);
            int detectedPartySize = detectPartySize(removeAccents(userMessage));
            long detectedBudget = extractBudgetFromText(removeAccents(userMessage));
            boolean wantsVoucher = detectVoucherIntent(removeAccents(userMessage));
            boolean wantsPaymentInfo = detectPaymentIntent(removeAccents(userMessage));

            MealPeriod currentPeriod = MealPeriodHelper.getCurrentPeriod(getCurrentTime());
            contextHeader.append(String.format("- Khung giờ phục vụ hiện tại: %s (%s).\n",
                    MealPeriodHelper.getDisplayName(currentPeriod), MealPeriodHelper.getTimeRange(currentPeriod)));

            // Pre-filter menu theo AllergyProfile TRƯỚC khi gửi sang Gemini (không loại bỏ món ngoài giờ để Gemini vẫn có thể tư vấn món thuộc ca khác khi khách hỏi)
            List<MenuItemEntity> safeItems = availableItems.stream()
                    .filter(i -> isDishSafeForProfile(i, detectedProfile))
                    .collect(Collectors.toList());

            // Rebuild menuArray với danh sách đã lọc an toàn
            ArrayNode safeMenuArray = objectMapper.createArrayNode();
            for (MenuItemEntity item : safeItems) {
                if (item.getPrice() == null || item.getPrice().compareTo(BigDecimal.ZERO) <= 0) continue;
                // Budget filter: nếu có ngân sách, loại bỏ các món vượt ngân sách/người
                if (detectedBudget > 0 && detectedPartySize > 0) {
                    long budgetPerPerson = detectedBudget / detectedPartySize;
                    if (item.getPrice().longValue() > budgetPerPerson * 1.3) continue; // 30% buffer
                }
                ObjectNode node = safeMenuArray.addObject();
                node.put("id", item.getId());
                node.put("name", item.getName());
                node.put("price", item.getPrice().longValue());
                node.put("cat", getCategoryNameSafe(item));
                node.put("desc", item.getDescription() != null ? item.getDescription() : "");
                node.put("veg", Boolean.TRUE.equals(item.getIsVegetarian()));
                node.put("spicy", item.getSpicyLevel() != null ? item.getSpicyLevel() : 0);
                if (item.getAllergens() != null) node.put("allergens", item.getAllergens());
                node.put("bestSeller", Boolean.TRUE.equals(item.getIsBestSeller()));
                boolean servingNow = isDishAvailableNow(item);
                node.put("servingNow", servingNow);
                String mealPeriodDesc = MealPeriodHelper.getPeriodDescription(item.getMealPeriods());
                node.put("mealPeriod", mealPeriodDesc);
            }
            String compactSafeMenuJson = objectMapper.writeValueAsString(safeMenuArray);

            StringBuilder extraInstructions = new StringBuilder();

            // [TIER-1] Allergy Safety - Cảnh báo dị ứng
            if (detectedProfile.hasAnyRestriction()) {
                extraInstructions.append("[AN TOÀN DỊ ỨNG - MỨC ĐỘ NGUY CẤP]: Khách có tiền sử dị ứng với: ")
                        .append(String.join(", ", detectedProfile.getMentionedAllergens()))
                        .append(". DANH SÁCH MENU bên dưới đã được hệ thống tự động sàng lọc theo hồ sơ dị ứng và thông tin thành phần ghi nhận. "
                              + "Bạn CHỈ ĐƯỢC gợi ý trong danh sách đó. Trong phần reply, hãy nhắc khách dặn nhân viên phục vụ khi lên món để bếp lưu ý chế biến riêng.\n");
            }

            // [TIER-2] Party Size & Vibe context
            if (detectedPartySize == 2) {
                boolean isDate = removeAccents(userMessage).contains("hen ho") || removeAccents(userMessage).contains("lang man") ||
                        removeAccents(userMessage).contains("am cung") || removeAccents(userMessage).contains("ban gai") ||
                        removeAccents(userMessage).contains("nguoi yeu");
                if (isDate) {
                    extraInstructions.append("[VỊ CẢNH HẸN HÒ]: Đây là buổi hẹn hò lãng mạn cho 2 người. "
                            + "Hãy tư vấn với văn phong ấm áp, tinh tế. Gợi ý set thực đơn hoàn chỉnh: "
                            + "1 món khai vị chia sẻ + 2 món chính (mỗi người 1 phần) + 1-2 đồ uống. "
                            + "Nhấn mạnh không khí ấm cúng, hương vị phù hợp đôi lứa.\n");
                } else {
                    extraInstructions.append("[QUY MÔ BÀN]: Bàn 2 người. Tư vấn thực đơn cân đối cho 2 người, "
                            + "gợi ý 1 món chia sẻ + 2 món chính + đồ uống.\n");
                }
            }

            // [TIER-3] Budget constraint
            if (detectedBudget > 0) {
                long perPerson = detectedPartySize > 0 ? detectedBudget / detectedPartySize : detectedBudget;
                extraInstructions.append(String.format(
                        "[NGÂN SÁCH]: Tổng ngân sách tối đa là %,d VND%s. "
                        + "Hãy chọn combo tiết kiệm nhất trong ngân sách, tính TỔNG GIÁ CÁC MÓN GỢI Ý, "
                        + "ghi rõ tổng cộng và số tiền còn lại trong ngân sách (nếu có) vào phần reply.\n",
                        detectedBudget,
                        detectedPartySize > 0 ? String.format(" (khoảng %,d VND/người)", perPerson) : ""
                ));
            }

            // [TIER-4] Voucher context - lấy từ DB nếu có
            if (wantsVoucher) {
                String voucherContext = getActiveVoucherContext();
                extraInstructions.append("[VOUCHER & KHUYẾN MÃI]: Khách hỏi về voucher/mã giảm giá. "
                        + "Hãy trả lời phần này TRƯỚC TIÊN trong reply. Thông tin voucher hiện hành:\n")
                        .append(voucherContext).append("\n");
            }

            // [TIER-5] Payment methods context
            if (wantsPaymentInfo) {
                extraInstructions.append("[PHƯƠNG THỨC THANH TOÁN]: Khách hỏi về thanh toán. "
                        + "Hãy trả lời rõ ràng trong phần reply. OmniResto hỗ trợ:\n")
                        .append(getPaymentMethodContext()).append("\n");
            }

            String systemPrompt = "Bạn là 'OmniBot' - Trợ lý ẩm thực cao cấp của nhà hàng OmniResto tại Việt Nam.\n" +
                    (contextHeader.length() > 0 ? "BỐI CẢNH PHỤC VỤ KHÁCH HÀNG:\n" + contextHeader + "\n" : "") +
                    (extraInstructions.length() > 0 ? "=== CHỈ THỊ ĐẶC BIỆT BẮT BUỘC THỰC HIỆN ===\n" + extraInstructions + "===\n\n" : "") +
                    "NHIỆM VỤ: Tư vấn món ăn theo khẩu vị, không khí bàn ăn (hẹn hò lãng mạn, gia đình, gặp mặt công việc), đồ uống. "
                    + "Đối với câu hỏi có NHIỀU YÊU CẦU (dị ứng + ngân sách + voucher + thanh toán), hãy trả lời TOÀN BỘ trong một phản hồi mạch lạc, có cấu trúc rõ ràng theo từng phần.\n" +
                    "QUY TẮC AN TOÀN BẮT BUỘC:\n" +
                    "1. Chỉ gợi ý các món trong danh sách MENU bên dưới. KHÔNG tự bịa món hoặc giá.\n" +
                    "2. KHÔNG cam kết an toàn y tế/dị ứng tuyệt đối. Luôn nhắc khách báo nhân viên phục vụ khi có dị ứng.\n" +
                    "3. Không nói 'tôi đã thêm vào giỏ hàng'. Đối với các món đang mở bán (servingNow = true), hãy mời khách bấm 'Thêm giỏ' trên thẻ món.\n" +
                    "4. KHI KHÁCH HỎI BẤT KỲ THÔNG TIN GÌ VỀ MÓN ĂN (giá cả, độ cay, thành phần, mô tả, món chay, dị ứng, giờ bán): Hãy trả lời chính xác dựa trên các trường dữ liệu trong MENU JSON.\n" +
                    "   - ĐỐI VỚI NHỮNG THỨ THỰC THỂ MÓN KHÔNG CÓ (như calo, đầu bếp cụ thể, trang trại xuất xứ): Hãy trả lời thành thật rằng thông tin này quán chưa ghi nhận trong thực đơn chuẩn, tuyệt đối KHÔNG tự bịa đặt, sau đó cung cấp các thông tin chính thức sẵn có của món ăn.\n" +
                    "   - ĐỐI VỚI MÓN KHÔNG CÓ TRONG MENU: Nêu rõ quán hiện tại không phục vụ món này và gợi ý món đặc sắc có sẵn của quán.\n" +
                    "5. QUY TẮC KHUNG GIỜ VÀ MỞ BÁN MÓN ĂN:\n" +
                    "   - 'servingNow': true là món đang trong khung giờ mở bán hiện tại.\n" +
                    "   - 'servingNow': false là món thuộc khung giờ khác (chưa mở bán lúc này).\n" +
                    "   - ĐỐI VỚI CÂU HỎI TƯ VẤN/GỢI Ý CHUNG (gợi ý món ngon, combo, ngân sách, hẹn hò, gia đình): BẮT BUỘC CHỈ GỢI Ý các món có 'servingNow': true. Tuyệt đối KHÔNG chọn món 'servingNow': false để tránh gây hiểu lầm cho khách hàng.\n" +
                    "   - ĐỐI VỚI CÂU HỎI HỎI ĐÍCH DANH MÓN ĂN NGOÀI GIỜ (ví dụ buổi sáng/trưa khách chủ động hỏi lẩu, buổi tối hỏi bánh cuốn sáng): Bạn VẪN PHẢI LIỆT KÊ VÀ TƯ VẤN món đó bình thường, đưa id vào 'itemIds'. TUY NHIÊN, BẮT BUỘC TRONG LỜI ĐÁP PHẢI KÈM DÒNG LƯU Ý RÕ RÀNG: Món [Tên món] chưa được mở bán, vui lòng quay lại vào giờ [mealPeriod]. (Tuyệt đối không mời khách bấm 'Thêm giỏ' đối với các món chưa mở bán này).\n" +
                    "   - QUY TẮC ĐẶC BIỆT KHI KHÁCH HỎI THEO DANH MỤC:\n" +
                    "     + Khi khách hỏi LẨU: BẮT BUỘC CHỈ GỢI Ý CÁC MÓN CÓ CHỮ 'LẨU' TRONG TÊN (như Set Lẩu Riêu Cua, Set Lẩu Thái, Lẩu Gà Đồi). TUYỆT ĐỐI KHÔNG chọn các món nhắm/món nhậu (như Gà ủ muối, Bò tơ cuộn bánh tráng) dù thuộc cùng danh mục 'Lẩu & Món Nhắm'.\n" +
                    "     + Khi khách hỏi PHỞ: Chỉ chọn món Phở. Khách hỏi BÚN: Chỉ chọn món Bún. Khách hỏi CƠM: Chỉ chọn món Cơm.\n" +
                    "6. Định dạng trả về BẮT BUỘC là JSON thuần túy (không kèm markdown code block):\n" +
                    "{\"reply\": \"lời tư vấn lịch sự, ấm áp, tự nhiên, có cấu trúc rõ ràng\", \"itemIds\": [\"id_mon_1\", \"id_mon_2\"]}\n\n" +
                    "DANH SÁCH MENU ĐÃ LỌC AN TOÀN:\n" + compactSafeMenuJson;

            ObjectNode requestBody = objectMapper.createObjectNode();

            // System Instruction
            ObjectNode systemInstruction = requestBody.putObject("system_instruction");
            systemInstruction.putObject("parts").put("text", systemPrompt);

            // Contents
            ArrayNode contents = requestBody.putArray("contents");

            // Tối đa 6 câu hội thoại gần nhất, sanitize độ dài và vai trò
            if (history != null) {
                int start = Math.max(0, history.size() - 6);
                for (int i = start; i < history.size(); i++) {
                    ChatMessageDto msg = history.get(i);
                    if (msg == null || msg.getContent() == null || msg.getContent().isBlank()) continue;
                    String safeRole = "user".equalsIgnoreCase(msg.getRole()) ? "user" : "model";
                    String safeContent = msg.getContent().trim();
                    if (safeContent.length() > 500) {
                        safeContent = safeContent.substring(0, 500);
                    }
                    ObjectNode turn = contents.addObject();
                    turn.put("role", safeRole);
                    turn.putArray("parts").addObject().put("text", safeContent);
                }
            }

            // Câu hỏi hiện tại
            ObjectNode currentTurn = contents.addObject();
            currentTurn.put("role", "user");
            currentTurn.putArray("parts").addObject().put("text", userMessage);

            // Generation Config with strict responseSchema
            ObjectNode genConfig = requestBody.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");
            genConfig.put("temperature", 0.4);
            genConfig.put("maxOutputTokens", 2048);

            ObjectNode responseSchema = genConfig.putObject("responseSchema");
            responseSchema.put("type", "OBJECT");
            ObjectNode schemaProperties = responseSchema.putObject("properties");
            schemaProperties.putObject("reply").put("type", "STRING");
            ObjectNode itemIdsNode = schemaProperties.putObject("itemIds");
            itemIdsNode.put("type", "ARRAY");
            itemIdsNode.putObject("items").put("type", "STRING");
            ArrayNode requiredArray = responseSchema.putArray("required");
            requiredArray.add("reply");
            requiredArray.add("itemIds");

            // Header Authentication (P1 Security Fix: Key passed in header, never in URL query param)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", geminiApiKey.trim());
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

            List<String> modelsToTry = new ArrayList<>();
            if (geminiModel != null && !geminiModel.trim().isEmpty()) {
                modelsToTry.add(geminiModel.trim());
            }
            if (geminiFallbackModels != null && !geminiFallbackModels.trim().isEmpty()) {
                for (String m : geminiFallbackModels.split(",")) {
                    String cleanM = m.trim();
                    if (!cleanM.isEmpty() && !modelsToTry.contains(cleanM)) {
                        modelsToTry.add(cleanM);
                    }
                }
            }
            if (!modelsToTry.contains("gemini-3.6-flash")) modelsToTry.add("gemini-3.6-flash");
            if (!modelsToTry.contains("gemini-1.5-flash")) modelsToTry.add("gemini-1.5-flash");

            for (String modelToUse : modelsToTry) {
                try {
                    // Endpoint URL without API key to prevent logging exposure on I/O error
                    String endpointUrl = String.format("%s/models/%s:generateContent",
                            geminiBaseUrl, modelToUse);

                    ResponseEntity<String> response = restTemplate.postForEntity(endpointUrl, entity, String.class);
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        JsonNode root = objectMapper.readTree(response.getBody());
                        JsonNode candidates = root.path("candidates");
                        if (candidates.isArray() && !candidates.isEmpty()) {
                            JsonNode parts = candidates.get(0).path("content").path("parts");
                            StringBuilder textBuilder = new StringBuilder();
                            if (parts.isArray()) {
                                for (JsonNode part : parts) {
                                    if (part.has("text") && !part.path("text").asText().isEmpty()) {
                                        if (part.path("thought").asBoolean(false)) {
                                            continue; // Bỏ qua suy nghĩ nội tâm của model
                                        }
                                        textBuilder.append(part.path("text").asText());
                                    }
                                }
                            }
                            String text = textBuilder.toString().trim();
                            if (!text.isEmpty()) {
                                return parseAndValidateGeminiResponse(text, itemMap, modelToUse, userMessage, history);
                            }
                        }
                    }
                } catch (HttpClientErrorException.TooManyRequests e) {
                    log.warn("🚨 Gemini API Quota Exceeded (HTTP 429) for model {}. Trying fallback model if available.", modelToUse);
                } catch (HttpClientErrorException.BadRequest | HttpClientErrorException.Forbidden | HttpClientErrorException.Unauthorized e) {
                    log.warn("🚨 Gemini API Key/Auth/Project error (HTTP {}). Short-circuiting model cascade.", e.getStatusCode());
                    break;
                } catch (Exception e) {
                    log.warn("Gemini call with model {} failed: {}. Trying fallback model if available...", modelToUse, e.getClass().getSimpleName());
                }
            }
        } catch (Exception e) {
            log.error("Failed to build or execute Gemini API request: {}", e.getClass().getSimpleName());
        }

        return null;
    }

    private AiChatResponse parseAndValidateGeminiResponse(String rawText, Map<String, MenuItemEntity> itemMap, String model, String originalUserMessage) {
        return parseAndValidateGeminiResponse(rawText, itemMap, model, originalUserMessage, null);
    }

    private AiChatResponse parseAndValidateGeminiResponse(String rawText, Map<String, MenuItemEntity> itemMap, String model, String originalUserMessage, List<ChatMessageDto> history) {
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

            String reply = "";
            List<String> rawItemIds = new ArrayList<>();

            if (cleanJson.startsWith("{") && cleanJson.endsWith("}")) {
                JsonNode parsed = objectMapper.readTree(cleanJson);

                if (parsed.has("reply") && !parsed.path("reply").asText().isBlank()) {
                    reply = parsed.path("reply").asText();
                } else if (parsed.has("message") && !parsed.path("message").asText().isBlank()) {
                    reply = parsed.path("message").asText();
                } else if (parsed.has("text") && !parsed.path("text").asText().isBlank()) {
                    reply = parsed.path("text").asText();
                } else if (parsed.has("content") && !parsed.path("content").asText().isBlank()) {
                    reply = parsed.path("content").asText();
                } else if (parsed.has("response") && !parsed.path("response").asText().isBlank()) {
                    reply = parsed.path("response").asText();
                } else if (parsed.has("answer") && !parsed.path("answer").asText().isBlank()) {
                    reply = parsed.path("answer").asText();
                } else if (parsed.has("recommendation")) {
                    StringBuilder synth = new StringBuilder();
                    synth.append("Dạ OmniBot xin gợi ý thực đơn cho quý khách:\n• **")
                            .append(parsed.path("recommendation").asText()).append("**\n");
                    if (parsed.has("reason") && !parsed.path("reason").asText().isBlank()) {
                        synth.append("\n_").append(parsed.path("reason").asText()).append("_\n");
                    }
                    if (parsed.has("voucher_details") && !parsed.path("voucher_details").asText().isBlank()) {
                        synth.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎫 **VOUCHER & ƯU ĐÃI**:\n")
                                .append(parsed.path("voucher_details").asText()).append("\n");
                    }
                    if (parsed.has("payment_methods") && parsed.path("payment_methods").isArray()) {
                        synth.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💳 **PHƯƠNG THỨC THANH TOÁN**:\n");
                        for (JsonNode pm : parsed.path("payment_methods")) {
                            synth.append("- ").append(pm.asText()).append("\n");
                        }
                    }
                    reply = synth.toString().trim();
                }

                JsonNode idsNode = parsed.path("itemIds");
                if (idsNode.isArray()) {
                    for (JsonNode idElem : idsNode) {
                        rawItemIds.add(idElem.asText());
                    }
                }
            } else {
                reply = cleanJson;
            }

            if (reply.isBlank() || (reply.startsWith("{") && reply.endsWith("}") && !reply.contains(" "))) {
                log.warn("Gemini reply was blank or malformed. Falling back to rule-based engine.");
                return generateRuleBasedResponse(originalUserMessage, new ArrayList<>(itemMap.values()), history);
            }

            // Server-side validation & Allergen Firewall:
            // 1. Lọc chỉ những itemId có thật trong quán
            // 2. LOẠI BỎ NGAY LẬP TỨC nếu món vi phạm AllergyProfile của khách (Two-tier Defense)
            AllergyProfile profile = detectAllergyProfile(removeAccents(originalUserMessage), history);
            List<AiRecommendedDishDto> validatedDishes = rawItemIds.stream()
                    .filter(itemMap::containsKey)
                    .map(itemMap::get)
                    .filter(item -> isDishSafeForProfile(item, profile))
                    .map(this::toDishDto)
                    .limit(4)
                    .collect(Collectors.toList());

            // Post-validation: Giới hạn ngân sách cứng (P1 Issue 5: Ngân sách do LLM tự cộng)
            long detectedBudget = extractBudgetFromText(originalUserMessage);
            if (detectedBudget > 0 && !validatedDishes.isEmpty()) {
                long currentTotal = 0;
                List<AiRecommendedDishDto> budgetDishes = new ArrayList<>();
                for (AiRecommendedDishDto d : validatedDishes) {
                    long p = d.getPrice() != null ? d.getPrice().longValue() : 0;
                    if (currentTotal + p <= (long)(detectedBudget * 1.1)) { // 10% buffer
                        budgetDishes.add(d);
                        currentTotal += p;
                    }
                }
                if (!budgetDishes.isEmpty()) {
                    validatedDishes = budgetDishes;
                }
            }

            // Reply Allergen Firewall (P0 Issue 2.6: LLM nhắc món dị ứng trong lời văn)
            if (profile.hasAnyRestriction()) {
                reply = sanitizeReplyTextForProfile(reply, profile);
            }

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
            log.error("Failed to parse Gemini structured response. Falling back to rule-based engine.");
            return generateRuleBasedResponse(originalUserMessage, new ArrayList<>(itemMap.values()), history);
        }
    }

    private String sanitizeReplyTextForProfile(String reply, AllergyProfile profile) {
        if (reply == null || !profile.hasAnyRestriction()) return reply;
        String norm = removeAccents(reply).toLowerCase();
        boolean hasViolation = false;

        if (profile.noSeafood && (norm.contains("tom ") || norm.contains("cua ") || norm.contains("hai san") || norm.contains("muc "))) {
            hasViolation = true;
        }
        if (profile.noChicken && (norm.contains("thit ga") || norm.contains("ga ta") || norm.contains("ga doi"))) {
            hasViolation = true;
        }
        if (profile.noBeef && (norm.contains("thit bo") || norm.contains("bap bo") || norm.contains("wagyu"))) {
            hasViolation = true;
        }
        if (profile.noPeanut && (norm.contains("dau phong") || norm.contains("lac "))) {
            hasViolation = true;
        }

        if (hasViolation) {
            log.warn("🚨 [SAFETY FIREWALL] Gemini reply text contained references to restricted allergen foods. Sanitizing reply disclaimer.");
            return reply + "\n\n*(Lưu ý an toàn: Toàn bộ danh sách thẻ món ăn đề xuất bên dưới đã được hệ thống sàng lọc nghiêm ngặt để loại bỏ mọi nguyên liệu kiêng khem theo yêu cầu của quý khách)*";
        }
        return reply;
    }
    /**
     * Handler \u0111a n\u0103ng cho c\u00e2u h\u1ecfi MULTI-INTENT ph\u1ee9c t\u1ea1p:
     * D\u1ecb \u1ee9ng + Ng\u00e2n s\u00e1ch + H\u1eb9n h\u00f2 + Voucher + Thanh to\u00e1n
     * Tr\u1ea3 v\u1ec1 response c\u00f3 c\u1ea5u tr\u00fac 3 ph\u1ea7n r\u00f5 r\u00e0ng, kh\u00f4ng \u0111\u1ee9t g\u00e3y.
     */
    private AiChatResponse generateMultiIntentResponse(String message, String norm, List<MenuItemEntity> items,
            AllergyProfile profile, int partySize, long budget,
            boolean wantsVoucher, boolean wantsPayment, boolean isDateNight) {

        List<MenuItemEntity> safeItems = items.stream()
                .filter(i -> isDishSafeForProfile(i, profile))
                .collect(Collectors.toList());

        List<MenuItemEntity> safeFoods = safeItems.stream()
                .filter(i -> {
                    String cat = removeAccents(getCategoryNameSafe(i)).toLowerCase();
                    return !cat.contains("uong") && !cat.contains("trang mieng");
                })
                .collect(Collectors.toList());

        List<MenuItemEntity> safeDrinks = safeItems.stream()
                .filter(i -> {
                    String cat = removeAccents(getCategoryNameSafe(i)).toLowerCase();
                    return cat.contains("uong") || cat.contains("trang mieng") || cat.contains("ca phe");
                })
                .collect(Collectors.toList());

        int effectiveParty = partySize > 0 ? partySize : (isDateNight ? 2 : 1);

        StringBuilder sb = new StringBuilder();

        // Mở đầu theo context
        if (isDateNight) {
            sb.append("Chào quý khách! OmniBot rất vui được đồng hành cùng buổi hẹn hò ấm cúng của hai bạn hôm nay.\n\n");
        } else if (partySize > 0) {
            sb.append(String.format("Chào quý khách! OmniBot rất hân hạnh được tư vấn cho bàn %d người của quý khách hôm nay.\n\n", partySize));
        }

        if (profile.hasAnyRestriction()) {
            String bannedStr = String.join(", ", profile.getMentionedAllergens());
            sb.append(String.format("✅ **Em đã ghi nhận quý khách dị ứng với: %s** — Toàn bộ gợi ý phía dưới đã được lọc sạch, loại bỏ hoàn toàn nguyên liệu trên.\n", bannedStr));
        }

        // ── PHẦN I: THỰC ĐƠN ──────────────────────────────
        sb.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        if (isDateNight && effectiveParty == 2) {
            sb.append("🌹 **I. GỢI Ý THỰC ĐƠN HẸN HÒ ẤM CÚNG** (cho 2 người)\n");
        } else {
            sb.append(String.format("🍽️ **I. GỢI Ý THỰC ĐƠN** (cho %d người)\n", effectiveParty));
        }

        // Ch\u1ecdn m\u00f3n theo ng\u00e2n s\u00e1ch
        MenuItemEntity chosenDrink = safeDrinks.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()))
                .findFirst()
                .orElse(!safeDrinks.isEmpty() ? safeDrinks.get(0) : null);

        // Ch\u1ecdn m\u00f3n theo ng\u00e2n s\u00e1ch ch\u00ednh x\u00e1c
        List<MenuItemEntity> chosenFoods;
        if (budget > 0) {
            long remainingBudget = budget;
            if (chosenDrink != null) {
                remainingBudget -= chosenDrink.getPrice().longValue() * effectiveParty;
            }
            final long maxFoodPrice = Math.max(remainingBudget / effectiveParty, 0);

            // T\u00ecm m\u00f3n \u0103n n\u1eb1m trong kho\u1ea3ng ng\u00e2n s\u00e1ch c\u00f2n l\u1ea1i
            List<MenuItemEntity> affordableFoods = safeFoods.stream()
                    .filter(i -> i.getPrice().longValue() <= maxFoodPrice)
                    .collect(Collectors.toList());

            List<MenuItemEntity> pool = affordableFoods.isEmpty() ? safeFoods : affordableFoods;
            chosenFoods = pool.stream()
                    .sorted((a, b) -> {
                        int bs1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int bs2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(bs2, bs1);
                    })
                    .limit(effectiveParty == 2 ? 2 : 1)
                    .collect(Collectors.toList());
            if (chosenFoods.isEmpty()) {
                chosenFoods = pool.stream()
                        .sorted(Comparator.comparing(MenuItemEntity::getPrice))
                        .limit(1)
                        .collect(Collectors.toList());
            }
        } else {
            chosenFoods = safeFoods.stream()
                    .sorted((a, b) -> {
                        int bs1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int bs2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(bs2, bs1);
                    })
                    .limit(effectiveParty == 2 ? 3 : 2)
                    .collect(Collectors.toList());
        }

        long totalPrice = 0;
        if (!chosenFoods.isEmpty()) {
            if (effectiveParty == 2) {
                // Khai v\u1ecb chia s\u1ebb
                MenuItemEntity appetizer = chosenFoods.get(0);
                sb.append(String.format("\n🥗 Khai vị chia sẻ:\n• **%s** — %,d đ\n  _%s_\n",
                        appetizer.getName(), appetizer.getPrice().longValue(),
                        appetizer.getDescription() != null ? appetizer.getDescription() : "Khai vị thanh đạm, kích thích vị giác"));
                totalPrice += appetizer.getPrice().longValue();

                if (chosenFoods.size() > 1) {
                    sb.append("\n🍜 Món chính (mỗi người 1 phần):\n");
                    for (int i = 1; i < chosenFoods.size(); i++) {
                        MenuItemEntity f = chosenFoods.get(i);
                        sb.append(String.format("• **%s** — %,d đ/phần\n  _%s_\n",
                                f.getName(), f.getPrice().longValue(),
                                f.getDescription() != null ? f.getDescription() : "Món ăn đậm đà hương vị"));
                        totalPrice += f.getPrice().longValue() * 2;
                    }
                }
            } else {
                sb.append("\n");
                for (int i = 0; i < chosenFoods.size(); i++) {
                    MenuItemEntity f = chosenFoods.get(i);
                    sb.append(String.format("%d. **%s** — %,d đ\n   _%s_\n",
                            i + 1, f.getName(), f.getPrice().longValue(),
                            f.getDescription() != null ? f.getDescription() : "Món ăn thơm ngon"));
                    totalPrice += f.getPrice().longValue();
                }
            }
        } else {
            sb.append("\n_(Vui lòng hỏi nhân viên phục vụ để được tư vấn trực tiếp.)_\n");
        }

        if (chosenDrink != null) {
            long drinkTotal = chosenDrink.getPrice().longValue() * effectiveParty;
            sb.append(String.format("\n☕ Đồ uống (%d ly): **%s** — %,d đ/ly\n",
                    effectiveParty, chosenDrink.getName(), chosenDrink.getPrice().longValue()));
            totalPrice += drinkTotal;
        }

        if (budget > 0) {
            long remaining = budget - totalPrice;
            sb.append(String.format("\n📊 **Tổng ước tính: ~%,d đ** / ngân sách %,d đ", totalPrice, budget));
            if (remaining >= 0) {
                sb.append(String.format(" _(còn dư ~%,d đ)_\n", remaining));
            } else {
                sb.append(" _(vui lòng điều chỉnh theo ý thích)_\n");
            }
        }

        if (profile.hasAnyRestriction()) {
            sb.append("\n_Quý khách bấm **'Thêm giỏ'** bên dưới cho các món. Vui lòng nhắc nhân viên phục vụ về dị ứng khi lên món để bếp chế biến riêng nhé!_\n");
        } else {
            sb.append("\n_Quý khách bấm **'Thêm giỏ'** bên dưới để thưởng thức trọn vẹn bữa ăn nhé!_\n");
        }

        // ── PHẦN II: VOUCHER ──────────────────────────────
        if (wantsVoucher) {
            sb.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
            sb.append("🎫 **II. VOUCHER & ƯU ĐÃI HIỆN HÀNH**\n\n");
            sb.append(getActiveVoucherContext());
        }

        // ── PHẦN III: THANH TOÁN ──────────────────────────
        if (wantsPayment) {
            sb.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
            sb.append("💳 **III. PHƯƠNG THỨC THANH TOÁN**\n\n");
            sb.append(getPaymentMethodContext());
        }

        if (profile.hasAnyRestriction() || hasAllergyOrDietMention(norm)) {
            sb.append(getAllergySafetyDisclaimer());
        }

        List<MenuItemEntity> allMatched = new ArrayList<>(chosenFoods);
        if (chosenDrink != null) allMatched.add(chosenDrink);
        if (allMatched.isEmpty()) {
            allMatched = safeItems.stream().filter(i -> Boolean.TRUE.equals(i.getIsBestSeller())).limit(3).collect(Collectors.toList());
        }

        return AiChatResponse.builder()
                .reply(sb.toString())
                .recommendedDishes(allMatched.stream().map(this::toDishDto).collect(Collectors.toList()))
                .modelUsed("Rule-Based Assistant")
                .build();
    }

    /**
     * Phát hiện xem khách có đang hỏi kiểm tra thành phần / chất dị ứng của một món ăn cụ thể không.
     * Ví dụ:
     * - "Món lẩu này có hải sản không, tôi bị dị ứng"
     * - "Lẩu thái này có tôm hay mực không?"
     * - "Phở bò có bột ngọt hay thịt gà không?"
     * - "Món này có cay không?"
     * - "Món đề xuất có hải sản không?"
     */
    public static boolean isDishIngredientCheckQuery(String norm) {
        if (norm == null || norm.isEmpty()) return false;

        // Nếu câu hỏi hỏi về voucher / thanh toán / ngân sách kết hợp hẹn hò -> đó là multi-intent query, không phải chỉ hỏi thành phần món
        boolean isGeneralPlanning = (norm.contains("voucher") || norm.contains("giam gia")) &&
                (norm.contains("thanh toan") || norm.contains("ngan sach") || norm.contains("hen ho") || norm.contains("2 nguoi"));
        if (isGeneralPlanning) {
            return false;
        }

        // Cụm từ hỏi trực tiếp xem có chứa thành phần/chất dị ứng hay không
        boolean hasDirectIngredientCheck =
                norm.contains("co hai san") || norm.contains("co tom") || norm.contains("co cua") ||
                norm.contains("co muc") || norm.contains("co ca ") || norm.contains("co thit ga") ||
                norm.contains("co ga") || norm.contains("co thit bo") || norm.contains("co bo ") ||
                norm.contains("co heo") || norm.contains("co thit heo") || norm.contains("co trung") ||
                norm.contains("co sua") || norm.contains("co dau phong") || norm.contains("co lac") ||
                norm.contains("chua hai san") || norm.contains("chua tom") || norm.contains("chua ga") ||
                norm.contains("chua bo") || norm.contains("chua trung") || norm.contains("chua sua") ||
                norm.contains("chua lac") || norm.contains("chua dau phong") ||
                norm.contains("an co bi di ung") || norm.contains("an co sao khong") ||
                ((norm.contains("an duoc khong") || norm.contains("an duoc ko") || norm.contains("dung duoc khong")) &&
                        (norm.contains("di ung") || norm.contains("kieng") || norm.contains("hai san") || norm.contains("ga")));

        boolean hasDishContext = norm.contains("mon") || norm.contains("lau") || norm.contains("pho") ||
                norm.contains("com") || norm.contains("bun") || norm.contains("banh") || norm.contains("goi") ||
                norm.contains("nem") || norm.contains("set") || norm.contains("nay") || norm.contains("do");

        return hasDirectIngredientCheck && hasDishContext;
    }

    /**
     * Phát hiện xem khách có đang hỏi bất kỳ thông tin gì về món ăn hay không:
     * - Giá cả, độ cay, món chay/mặn, thành phần, cách chế biến, cảnh báo dị ứng, giờ bán, độ ngon.
     * - Các thông tin thực thể món không có (calo, đầu bếp, trang trại xuất xứ, hạn bảo quản).
     * - Món không có trong thực đơn quán (hỏi quán có bán món này không).
     */
    public static boolean isDishInquiryQuery(String norm, List<MenuItemEntity> items, List<ChatMessageDto> history) {
        if (norm == null || norm.isEmpty()) return false;

        // 1. Loại trừ nếu là câu hỏi ngân sách / đa ý định / voucher / thanh toán / hẹn hò
        long budget = extractBudgetFromText(norm);
        if (budget > 0) {
            return false;
        }

        if (detectVoucherIntent(norm) || detectPaymentIntent(norm)) {
            return false;
        }

        boolean isDateNight = norm.contains("hen ho") || norm.contains("lang man") || norm.contains("am cung") ||
                norm.contains("ban gai") || norm.contains("nguoi yeu") || norm.contains("1 nguoi nua");
        if (isDateNight) {
            return false;
        }

        int partySize = detectPartySize(norm);
        if (partySize >= 2) {
            return false;
        }

        boolean isComboOrPlanner = norm.contains("combo") || norm.contains("ngan sach") ||
                (norm.contains("thuc don") && !norm.contains("thuc don cua quan")) ||
                (norm.contains("goi y") && (norm.contains("mon") || norm.contains("bua an") || norm.contains("cho toi"))) ||
                norm.contains("tu van") || norm.contains("chon giup");
        if (isComboOrPlanner && !norm.contains("gia bao nhieu") && !norm.contains("cay khong") && !norm.contains("an chay duoc")) {
            return false;
        }

        // 2. Loại trừ các câu hỏi tiện ích nhà hàng chung
        if (norm.contains("wifi") || norm.contains("mat khau") || norm.contains("dia chi") ||
            norm.contains("mo cua") || norm.contains("dong cua") || norm.contains("gio mo cua")) {
            return false;
        }

        // 3. Từ khóa hỏi về đặc tính hoặc thông tin món ăn:
        boolean hasDishAttributeQuestion =
                DISH_PRICE_QUERY_PATTERN.matcher(norm).find() || PRICE_WORD_PATTERN.matcher(norm).find() ||
                norm.contains("cay khong") || norm.contains("co cay") || norm.contains("do cay") || norm.contains("cay cap may") || norm.contains("cay nhe") ||
                norm.contains("an chay duoc khong") || norm.contains("chay khong") || norm.contains("la mon chay") || norm.contains("mon chay hay man") || norm.contains("co phai mon chay") ||
                norm.contains("thanh phan") || norm.contains("nguyen lieu") || norm.contains("gom nhung gi") || norm.contains("nau bang gi") || norm.contains("lam tu gi") || norm.contains("che bien") || norm.contains("cach lam") ||
                norm.contains("con khong") || norm.contains("con hang khong") || norm.contains("con ban khong") || norm.contains("co san khong") ||
                norm.contains("phuc vu luc nao") || norm.contains("buoi nao") || norm.contains("buoi sang") || norm.contains("buoi toi") || norm.contains("luc may gio") ||
                norm.contains("co ngon khong") || norm.contains("ban chay khong") || norm.contains("best seller") || norm.contains("noi tieng khong") || norm.contains("vi the nao") ||
                norm.contains("calo") || norm.contains("calories") || norm.contains("nang luong") ||
                norm.contains("ai nau") || norm.contains("dau bep") || norm.contains("xuat xu") || norm.contains("trang trai") || norm.contains("bao quan") || norm.contains("han su dung") ||
                norm.contains("thong tin mon") || norm.contains("thong tin ve mon") || norm.contains("chi tiet mon") || norm.contains("gioi thieu mon");

        // 4. Kiểm tra có từ khóa chỉ món hoặc đại từ quy chiếu
        boolean hasDishContext = norm.contains("mon nay") || norm.contains("mon do") ||
                norm.contains("mon de xuat") || norm.contains("mon vua goi y") || norm.contains("mon tren") ||
                norm.contains("lau nay") || norm.contains("pho nay") || norm.contains("dia nay") || norm.contains("to nay") ||
                norm.startsWith("mon ") || norm.contains(" ve mon ") || norm.contains(" mon ");

        // 5. Kiểm tra câu hỏi xem quán có món X không (kể cả món không có trong thực đơn)
        boolean asksIfRestaurantHasDish = (norm.contains("quan co") || norm.contains("o day co") || norm.contains("nha hang co") || norm.contains("co ban") || norm.contains("co phuc vu")) &&
                (norm.contains("khong") || norm.contains("ko") || norm.contains("chua"));

        boolean isCategoryInquiry = norm.contains("lau") || (norm.contains("pho") && !norm.contains("pho mai")) ||
                (norm.contains("com") && !norm.contains("combo")) || norm.contains("bun") || norm.contains("banh mi");

        // Nếu khách hỏi về danh mục chung (như "quán có lẩu không?", "ở đây có phở không?"):
        // Nếu không khớp với 1 món cụ thể nào -> trả về false để Category Engine giải quyết và liệt kê toàn bộ món trong danh mục đó
        if (asksIfRestaurantHasDish && isCategoryInquiry && findTargetDishForInquiry(norm, history, items) == null) {
            return false;
        }

        if (asksIfRestaurantHasDish && (norm.contains("mon") || norm.contains("pizza") || norm.contains("sushi") ||
                norm.contains("bun") || norm.contains("pho") || norm.contains("lau") || norm.contains("com") ||
                norm.contains("banh") || norm.contains("mi") || norm.contains("tra") || norm.contains("cafe") || norm.contains("ca phe"))) {
            return true;
        }

        // 6. Nhận diện món ăn trong thực đơn hoặc lịch sử hội thoại
        MenuItemEntity matchedDish = findTargetDishForInquiry(norm, history, items);
        if (matchedDish != null) {
            if (hasDishAttributeQuestion || hasDishContext || norm.contains("nhu the nao") || norm.contains("the nao") || norm.contains("la gi") || norm.contains("co gi")) {
                return true;
            }
        }

        // 7. Có thuộc tính món và ngữ cảnh món
        if (hasDishAttributeQuestion && (hasDishContext || (history != null && !history.isEmpty()))) {
            if (matchedDish != null || hasDishContext) {
                return true;
            }
        }

        return false;
    }

    private List<MenuItemEntity> findTargetDishesForCheck(String norm, List<ChatMessageDto> history, List<MenuItemEntity> items) {
        List<MenuItemEntity> targets = new ArrayList<>();

        // 1. Tìm món khớp cụ thể nhất theo tên và từ khóa đặc trưng
        MenuItemEntity bestMatch = null;
        int maxMatchScore = 0;

        for (MenuItemEntity item : items) {
            String iName = removeAccents(item.getName()).toLowerCase();
            int score = 0;

            // Kiểm tra các cặp từ đặc trưng của món
            if (iName.contains("lau thai") && (norm.contains("lau thai") || norm.contains("tomyum"))) score += 10;
            if (iName.contains("la e") && (norm.contains("la e") || (norm.contains("lau ga") && norm.contains("la e")))) score += 10;
            if (iName.contains("rieu cua") && norm.contains("rieu cua")) score += 10;
            if (iName.contains("pho bo") && norm.contains("pho bo")) score += 10;
            if (iName.contains("pho ga") && norm.contains("pho ga")) score += 10;
            if (iName.contains("com tam") && norm.contains("com tam")) score += 10;
            if (iName.contains("bun cha") && norm.contains("bun cha")) score += 10;
            if (iName.contains("banh mi chao") && norm.contains("banh mi chao")) score += 10;
            if (iName.contains("banh mi heo quay") && norm.contains("heo quay")) score += 10;
            if (iName.contains("nem ran") && norm.contains("nem ran")) score += 10;
            if (iName.contains("goi ngo sen") && norm.contains("ngo sen")) score += 10;

            // Kiểm tra tên món đầy đủ
            if (norm.contains(iName)) score += 15;

            if (score > maxMatchScore) {
                maxMatchScore = score;
                bestMatch = item;
            }
        }

        if (bestMatch != null && maxMatchScore >= 10) {
            targets.add(bestMatch);
            return targets;
        }

        // 2. Nếu khách dùng đại từ quy chiếu ("món này", "lẩu này", "món đó", "món đề xuất")
        // Lục trong history lượt chat gần nhất của bot để xem món nào vừa được đề xuất
        if (norm.contains("nay") || norm.contains("do") || norm.contains("tren") || norm.contains("de xuat") || norm.contains("vua goi y")) {
            if (history != null && !history.isEmpty()) {
                for (int i = history.size() - 1; i >= 0; i--) {
                    ChatMessageDto msg = history.get(i);
                    if (msg != null && msg.getContent() != null) {
                        String histNorm = removeAccents(msg.getContent());
                        for (MenuItemEntity item : items) {
                            String iName = removeAccents(item.getName());
                            if (histNorm.contains(iName)) {
                                if (norm.contains("lau") && !iName.contains("lau")) continue;
                                if (norm.contains("pho") && !iName.contains("pho")) continue;
                                targets.add(item);
                                return targets;
                            }
                        }
                    }
                }
            }
        }

        // 3. Nếu khách hỏi chung về một dòng món (ví dụ: "lẩu", "phở", "cơm")
        if (norm.contains("lau")) {
            for (MenuItemEntity item : items) {
                String iName = removeAccents(item.getName());
                String iCat = removeAccents(getCategoryNameSafe(item));
                if (iName.contains("lau") || iCat.contains("lau")) {
                    targets.add(item);
                }
            }
        } else if (norm.contains("pho")) {
            for (MenuItemEntity item : items) {
                if (removeAccents(item.getName()).contains("pho")) targets.add(item);
            }
        }

        return targets;
    }

    private AiChatResponse handleDishIngredientCheck(String message, String norm, List<ChatMessageDto> history,
                                                   List<MenuItemEntity> items, AllergyProfile profile) {
        List<MenuItemEntity> targetDishes = findTargetDishesForCheck(norm, history, items);

        AllergyProfile checkProfile = new AllergyProfile();
        checkProfile.noChicken = profile.noChicken;
        checkProfile.noSeafood = profile.noSeafood;
        checkProfile.noBeef = profile.noBeef;
        checkProfile.noPork = profile.noPork;
        checkProfile.noPeanut = profile.noPeanut;
        checkProfile.noEgg = profile.noEgg;
        checkProfile.noMilk = profile.noMilk;
        checkProfile.noSpicy = profile.noSpicy;
        checkProfile.isVegetarian = profile.isVegetarian;

        // Bổ sung cụ thể thành phần đang được hỏi trực tiếp trong câu:
        if (norm.contains("co hai san") || norm.contains("chua hai san") ||
            norm.contains("co tom") || norm.contains("co cua") || norm.contains("co muc") || norm.contains("co ca ")) {
            checkProfile.noSeafood = true;
        }
        if (norm.contains("co thit ga") || norm.contains("co ga") || norm.contains("chua ga") || norm.contains("chua thit ga")) {
            checkProfile.noChicken = true;
        }
        if (norm.contains("co thit bo") || norm.contains("co bo ") || norm.contains("chua bo") || norm.contains("chua thit bo")) {
            checkProfile.noBeef = true;
        }
        if (norm.contains("co heo") || norm.contains("co thit heo") || norm.contains("co thit lon") || norm.contains("chua heo")) {
            checkProfile.noPork = true;
        }
        if (norm.contains("co dau phong") || norm.contains("co lac") || norm.contains("chua dau phong") || norm.contains("chua lac")) {
            checkProfile.noPeanut = true;
        }
        if (norm.contains("co trung") || norm.contains("chua trung")) {
            checkProfile.noEgg = true;
        }
        if (norm.contains("co sua") || norm.contains("chua sua") || norm.contains("co pho mai")) {
            checkProfile.noMilk = true;
        }
        if (norm.contains("co cay") || norm.contains("co ot")) {
            checkProfile.noSpicy = true;
        }

        StringBuilder sb = new StringBuilder();
        List<MenuItemEntity> recommendedDishes = new ArrayList<>();
        String allergensList = String.join(", ", checkProfile.getMentionedAllergens());
        if (allergensList.isEmpty()) {
            if (norm.contains("hai san") || norm.contains("tom") || norm.contains("cua") || norm.contains("muc")) allergensList = "hải sản (tôm, cua, cá, mực)";
            else if (norm.contains("ga")) allergensList = "thịt gà";
            else if (norm.contains("bo")) allergensList = "thịt bò";
            else if (norm.contains("dau phong") || norm.contains("lac")) allergensList = "đậu phộng / lạc";
            else allergensList = "nguyên liệu kiêng khem";
        }

        if (targetDishes.isEmpty()) {
            sb.append("Dạ em xin hỗ trợ kiểm tra thành phần món ăn cho quý khách ạ!\n\n")
              .append("Để em có thể tra cứu chính xác xem món có chứa thành phần gây dị ứng không, quý khách vui lòng cho em biết tên cụ thể món ăn mà mình đang quan tâm nhé (ví dụ: *Set Lẩu Thái*, *Lẩu Gà lá é*, *Lẩu riêu cua*...). Em sẽ kiểm tra ngay lập tức ạ!");
            return AiChatResponse.builder()
                    .reply(sb.toString())
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Dish-Allergen-Inspector")
                    .build();
        }

        // Nếu khách hỏi về 1 món cụ thể
        if (targetDishes.size() == 1) {
            MenuItemEntity dish = targetDishes.get(0);
            boolean isSafe = isDishSafeForProfile(dish, checkProfile);

            if (!isSafe) {
                // MÓN CÓ CHỨA DỊ ỨNG -> CẢNH BÁO RÕ RÀNG & GỢI Ý MÓN AN TOÀN THAY THẾ
                sb.append(String.format("Dạ em xin kiểm tra và báo ngay cho quý khách:\n\n"
                        + "⚠️ **Món %s CÓ CHỨA %s** ạ!\n\n", dish.getName(), allergensList));

                if (dish.getDescription() != null && !dish.getDescription().isEmpty()) {
                    sb.append(String.format("• **Thành phần món**: %s\n\n", dish.getDescription()));
                }

                sb.append(String.format("Vì quý khách có tiền sử dị ứng với **%s**, em khuyên quý khách **TUYỆT ĐỐI KHÔNG NÊN DÙNG** món này để bảo đảm an toàn sức khỏe ạ.\n\n", allergensList));

                // Tìm món cùng nhóm (ví dụ cùng là Lẩu hoặc cùng phân loại) nhưng HOÀN TOÀN AN TOÀN
                List<MenuItemEntity> safeAlternatives = items.stream()
                        .filter(i -> !i.getId().equals(dish.getId()))
                        .filter(i -> isDishSafeForProfile(i, checkProfile))
                        .filter(i -> {
                            String dName = removeAccents(dish.getName());
                            String iName = removeAccents(i.getName());
                            if (dName.contains("lau") && iName.contains("lau")) return true;
                            if (dName.contains("pho") && iName.contains("pho")) return true;
                            return false;
                        })
                        .limit(2)
                        .collect(Collectors.toList());

                if (safeAlternatives.isEmpty()) {
                    safeAlternatives = items.stream()
                            .filter(i -> isDishSafeForProfile(i, checkProfile))
                            .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()))
                            .limit(2)
                            .collect(Collectors.toList());
                }

                if (!safeAlternatives.isEmpty()) {
                    sb.append("💡 **Gợi ý lựa chọn an toàn thay thế cho quý khách**:\n");
                    for (MenuItemEntity alt : safeAlternatives) {
                        sb.append(String.format("• **%s** (%,d đ): %s\n",
                                alt.getName(), alt.getPrice().longValue(),
                                alt.getDescription() != null ? alt.getDescription() : "Hoàn toàn không chứa nguyên liệu dị ứng"));
                        recommendedDishes.add(alt);
                    }
                    sb.append("\nQuý khách có thể bấm **'Thêm giỏ'** các món an toàn ở trên. Khi nhân viên lên món, quý khách nhớ dặn lại để bếp dùng dụng cụ chế biến riêng nhé!");
                }
            } else {
                // MÓN AN TOÀN -> XÁC NHẬN TRUNG THỰC & LƯU Ý BẾP
                sb.append(String.format("Dạ theo hồ sơ thực đơn niêm yết tại quán:\n\n"
                        + "✅ **Món %s HOÀN TOÀN KHÔNG CHỨA %s** trong công thức chế biến niêm yết ạ!\n\n",
                        dish.getName(), allergensList));

                if (dish.getDescription() != null && !dish.getDescription().isEmpty()) {
                    sb.append(String.format("• **Thành phần món gồm**: %s\n\n", dish.getDescription()));
                }

                sb.append("Quý khách có thể an tâm thưởng thức món ăn này. Bấm **'Thêm giỏ'** để đặt món nhé!\n\n"
                        + "_(⚠️ Lưu ý an toàn y tế: Dù công thức không chứa chất gây dị ứng, quý khách vui lòng dặn dò nhân viên phục vụ khi lên món để bếp dùng dụng cụ chế biến riêng biệt, phòng ngừa tối đa nguy cơ nhiễm chéo nhé!)_");
                recommendedDishes.add(dish);
            }
        } else {
            // Khách hỏi chung về 1 nhóm món (ví dụ: "các món lẩu của quán có hải sản không, tôi bị dị ứng?")
            sb.append(String.format("Dạ em xin kiểm tra chi tiết toàn bộ các món theo yêu cầu của quý khách đối với **%s** ạ:\n\n", allergensList));

            List<MenuItemEntity> safeList = new ArrayList<>();
            List<MenuItemEntity> unsafeList = new ArrayList<>();

            for (MenuItemEntity d : targetDishes) {
                if (isDishSafeForProfile(d, checkProfile)) {
                    safeList.add(d);
                } else {
                    unsafeList.add(d);
                }
            }

            if (!unsafeList.isEmpty()) {
                sb.append("⚠️ **MÓN CÓ NGUY CƠ DỊ ỨNG (KHÔNG NÊN DÙNG)**:\n");
                for (MenuItemEntity d : unsafeList) {
                    sb.append(String.format("• ❌ **%s** (%,d đ): %s\n",
                            d.getName(), d.getPrice().longValue(),
                            d.getDescription() != null ? d.getDescription() : "Có chứa nguyên liệu dị ứng"));
                }
                sb.append("\n");
            }

            if (!safeList.isEmpty()) {
                sb.append("✅ **MÓN PHÙ HỢP GỢI Ý CHO QUÝ KHÁCH**:\n");
                for (MenuItemEntity d : safeList) {
                    String note = Boolean.TRUE.equals(d.getAllergenVerified())
                            ? "Đã qua thẩm định an toàn dị ứng"
                            : (d.getDescription() != null ? d.getDescription() : "Không ghi nhận nguyên liệu kiêng khem");
                    sb.append(String.format("• ✔️ **%s** (%,d đ): %s\n",
                            d.getName(), d.getPrice().longValue(), note));
                    recommendedDishes.add(d);
                }
                sb.append("\nQuý khách bấm **'Thêm giỏ'** các món an toàn bên dưới để thưởng thức trọn vẹn nhé! Đừng quên nhắc nhân viên phục vụ khi lên món để bếp lưu ý chế biến riêng biệt ạ.");
            }
        }

        sb.append(getAllergySafetyDisclaimer());

        return AiChatResponse.builder()
                .reply(sb.toString().trim())
                .recommendedDishes(recommendedDishes.stream().map(this::toDishDto).collect(Collectors.toList()))
                .modelUsed("Dish-Allergen-Inspector")
                .build();
    }

    /**
     * Handler chuyên sâu cho BẤT KỲ CÂU HỎI NÀO VỀ MÓN ĂN:
     * - Giá cả, Độ cay, Thành phần, Cách nấu, Món chay/mặn, Cảnh báo dị ứng, Giờ bán, Độ ngon/Best seller, Mô tả.
     * - Xử lý thông tin thực thể món KHÔNG có (calo, đầu bếp, trang trại xuất xứ...) -> trung thực giải thích.
     * - Xử lý món KHÔNG CÓ trong thực đơn -> thông báo rõ ràng & đề xuất món ngon của quán.
     */
    private AiChatResponse handleDishInquiry(String message, String norm, List<ChatMessageDto> history, List<MenuItemEntity> items) {
        MenuItemEntity dish = findTargetDishForInquiry(norm, history, items);
        StringBuilder sb = new StringBuilder();

        // 1. Trường hợp không tìm thấy món ăn trong thực đơn của quán
        if (dish == null) {
            // Phòng vệ đặc biệt: Nếu khách hỏi về lẩu (như "quán có lẩu không?", "ở đây có lẩu ko?")
            // Nhà hàng thực sự CÓ phục vụ lẩu, tuyệt đối không báo thiếu món rồi gợi ý phở/cơm!
            if (norm.contains("lau")) {
                List<MenuItemEntity> hotpots = items.stream()
                        .filter(i -> removeAccents(i.getName()).contains("lau"))
                        .limit(3)
                        .collect(Collectors.toList());
                if (!hotpots.isEmpty()) {
                    sb.append("Dạ OmniResto có phục vụ các món lẩu nóng hổi trứ danh sau đây dành cho quý khách ạ:\n\n");
                    for (int idx = 0; idx < hotpots.size(); idx++) {
                        MenuItemEntity h = hotpots.get(idx);
                        sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, h.getName(), h.getPrice().longValue(),
                                h.getDescription() != null ? h.getDescription() : "Nước lẩu đậm vị truyền thống, ngập tràn topping tươi ngon tuyển chọn"));
                    }
                    sb.append("\n\n").append(buildMealPeriodActionOrNotice(hotpots));
                    return AiChatResponse.builder()
                            .reply(sb.toString().trim())
                            .recommendedDishes(hotpots.stream().map(this::toDishDto).collect(Collectors.toList()))
                            .modelUsed("Food-Category-Engine")
                            .build();
                }
            }

            String requestedDish = extractRequestedDishName(message, norm);
            if (requestedDish != null && !requestedDish.isEmpty()) {
                sb.append(String.format("Dạ OmniResto rất tiếc là hiện tại món **%s** không có trong thực đơn phục vụ của quán ạ!\n\n", requestedDish));
            } else {
                sb.append("Dạ OmniResto rất tiếc là hiện tại món ăn này **không có trong thực đơn** phục vụ của quán ạ!\n\n");
            }
            sb.append("Quý khách có thể tham khảo các món đặc sản trứ danh đang rất được ưa chuộng tại nhà hàng:\n");
            List<MenuItemEntity> bestSellers = items.stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()) || (i.getPrice() != null && i.getPrice().compareTo(BigDecimal.ZERO) > 0))
                    .limit(3)
                    .collect(Collectors.toList());
            for (MenuItemEntity b : bestSellers) {
                sb.append(String.format("• **%s** (%,d đ): %s\n", b.getName(), b.getPrice().longValue(),
                        b.getDescription() != null ? b.getDescription() : "Món ngon đậm vị truyền thống"));
            }
            sb.append("\nQuý khách bấm **'Thêm giỏ'** các món trên hoặc nhắn cho em khẩu vị để em tư vấn thêm nhé!");
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(bestSellers.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Dish-Information-Engine")
                    .build();
        }

        // 2. Trả lời cụ thể câu hỏi mà khách hàng đang hỏi về món ăn
        List<String> directAnswers = new ArrayList<>();

        // Hỏi giá
        boolean askedPrice = DISH_PRICE_QUERY_PATTERN.matcher(norm).find() || PRICE_WORD_PATTERN.matcher(norm).find();
        if (askedPrice) {
            directAnswers.add(String.format("💵 **Giá niêm yết**: Món **%s** hiện có giá là **%,d đ** / phần ạ.", dish.getName(), dish.getPrice().longValue()));
        }

        // Hỏi độ cay
        boolean askedSpicy = norm.contains("cay") || norm.contains("ot");
        if (askedSpicy) {
            int spicy = dish.getSpicyLevel() != null ? dish.getSpicyLevel() : 0;
            if (spicy == 0) {
                directAnswers.add(String.format("🌶️ **Về độ cay**: Món **%s** hoàn toàn **KHÔNG CAY** (Cấp độ 0/5%s), rất thích hợp cho cả trẻ nhỏ và thực khách không ăn cay ạ.",
                        dish.getName(), Boolean.TRUE.equals(dish.getSpicyVerified()) ? " - Bếp trưởng đã xác nhận" : ""));
            } else {
                String descSpicy = spicy == 1 ? "cay nhẹ" : (spicy == 2 ? "cay vừa thơm nồng" : "cay đậm đà xé lưỡi");
                directAnswers.add(String.format("🌶️ **Về độ cay**: Món **%s** có độ cay **Cấp độ %d/5** (%s%s). Khi đặt món, quý khách có thể ghi chú điều chỉnh độ cay theo ý thích nhé!",
                        dish.getName(), spicy, descSpicy, Boolean.TRUE.equals(dish.getSpicyVerified()) ? " - Đã thẩm định" : ""));
            }
        }

        // Hỏi chay / mặn
        boolean askedVeg = VEGETARIAN_PATTERN.matcher(norm).find() || norm.contains("an chay duoc khong") || norm.contains("chay khong") || norm.contains("co phai mon chay");
        if (askedVeg) {
            if (Boolean.TRUE.equals(dish.getIsVegetarian())) {
                directAnswers.add(String.format("🥗 **Về chế độ ăn**: Món **%s** là **MÓN THUẦN CHAY**, được chế biến từ nguyên liệu rau củ và thực vật tươi sạch, thực khách ăn chay an tâm thưởng thức ạ.", dish.getName()));
            } else {
                directAnswers.add(String.format("🥩 **Về chế độ ăn**: Món **%s** là **MÓN MẶN** (không phải món chay) ạ.", dish.getName()));
            }
        }

        // Hỏi thành phần / nguyên liệu / cách chế biến
        boolean askedIngredients = norm.contains("thanh phan") || norm.contains("nguyen lieu") || norm.contains("gom nhung gi") ||
                norm.contains("nau bang gi") || norm.contains("lam tu gi") || norm.contains("che bien") || norm.contains("cach lam");
        if (askedIngredients) {
            String ingText = dish.getIngredients() != null && !dish.getIngredients().trim().isEmpty()
                    ? dish.getIngredients().trim()
                    : (dish.getDescription() != null ? dish.getDescription().trim() : "Nguyên liệu tươi ngon tuyển chọn trong ngày");
            directAnswers.add(String.format("🌿 **Thành phần & Nguyên liệu chế biến**: %s", ingText));
        }

        // Hỏi chất dị ứng
        boolean askedAllergen = norm.contains("di ung") || norm.contains("hai san") || norm.contains("tom") || norm.contains("cua") ||
                norm.contains("thit ga") || norm.contains("dau phong") || norm.contains("trung") || norm.contains("sua");
        if (askedAllergen) {
            String allergenText;
            if (dish.getAllergens() != null && !dish.getAllergens().trim().isEmpty() && !dish.getAllergens().equalsIgnoreCase("Không có")) {
                allergenText = String.format("Món có chứa: **%s**", dish.getAllergens());
            } else if (Boolean.TRUE.equals(dish.getAllergenVerified())) {
                allergenText = "Công thức đã được Bếp thẩm định không ghi nhận chất dị ứng phổ biến";
            } else {
                allergenText = "Chưa ghi nhận chất dị ứng trong công thức niêm yết (chưa qua kiểm định chuyên sâu từ Bếp trưởng - Quý khách lưu ý dặn nhân viên khi đặt món)";
            }
            directAnswers.add(String.format("⚠️ **Cảnh báo dị ứng**: %s.", allergenText));
        }

        // Hỏi khung giờ / tình trạng còn hàng
        boolean askedTimeOrStatus = norm.contains("con khong") || norm.contains("con ban khong") || norm.contains("co san khong") ||
                norm.contains("phuc vu luc nao") || norm.contains("buoi nao") || norm.contains("buoi sang") || norm.contains("buoi toi") || norm.contains("luc may gio");
        if (askedTimeOrStatus) {
            String statusText = dish.getStatus() == MenuStatus.available ? "Đang sẵn sàng phục vụ tại quán" : "Tạm hết hàng";
            String periodText = dish.getMealPeriods() != null
                    ? dish.getMealPeriods().replace("MORNING", "Sáng").replace("NOON", "Trưa").replace("EVENING", "Tối")
                    : "Cả ngày";
            directAnswers.add(String.format("⏰ **Thời gian & Tình trạng**: Món **%s** (Khung giờ phục vụ: %s) ạ.", statusText, periodText));
        }

        // Hỏi độ ngon / best seller
        boolean askedPopularity = norm.contains("co ngon khong") || (norm.contains("ban chay") && !norm.contains("chay")) || norm.contains("best seller") || norm.contains("noi tieng");
        if (askedPopularity) {
            if (Boolean.TRUE.equals(dish.getIsBestSeller())) {
                directAnswers.add(String.format("⭐ **Độ ưa chuộng**: Món **%s** là một trong những **Top Best-Seller (Bán chạy nhất)** của OmniResto, được rất nhiều thực khách yêu thích và lựa chọn thường xuyên ạ!", dish.getName()));
            } else {
                directAnswers.add(String.format("👍 **Hương vị**: Món **%s** là món ăn mang đậm phong vị truyền thống, vị thanh ngọt tự nhiên được thực khách đánh giá cao ạ.", dish.getName()));
            }
        }

        // Hỏi những thứ THỰC THỂ KHÔNG CÓ (như calo, đầu bếp, trang trại xuất xứ...)
        boolean askedOutOfEntity = norm.contains("calo") || norm.contains("calories") ||
                norm.contains("ai nau") || norm.contains("dau bep") ||
                norm.contains("xuat xu tu dau") || norm.contains("trang trai") || norm.contains("bao quan");
        if (askedOutOfEntity) {
            String missingField = "chỉ số năng lượng Calo chi tiết";
            if (norm.contains("ai nau") || norm.contains("dau bep")) missingField = "thông tin danh tính đầu bếp phụ trách cụ thể";
            else if (norm.contains("trang trai") || norm.contains("xuat xu")) missingField = "thông tin trang trại xuất xứ chi tiết";
            else if (norm.contains("bao quan")) missingField = "hướng dẫn bảo quản lưu kho";

            directAnswers.add(String.format("ℹ️ **Lưu ý về %s**: Hiện tại hồ sơ thực đơn chuẩn của OmniResto **chưa ghi nhận** thông tin này trong hệ thống. "
                    + "Tuy nhiên, OmniResto luôn tuân thủ quy chuẩn an toàn vệ sinh thực phẩm nghiêm ngặt trong mọi khâu tiếp nhận và chế biến nguyên liệu ạ.", missingField));
        }

        // Ghép phần trả lời trực tiếp
        if (!directAnswers.isEmpty()) {
            sb.append("Dạ em xin trả lời thông tin quý khách quan tâm về món **").append(dish.getName()).append("** ạ:\n\n");
            for (String ans : directAnswers) {
                sb.append(ans).append("\n\n");
            }
        } else {
            sb.append("Dạ em xin gửi đến quý khách thông tin chi tiết về món **").append(dish.getName()).append("** tại OmniResto ạ:\n\n");
        }

        // 3. Khối Hồ sơ đầy đủ của món ăn (Dish Profile Block)
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append(String.format("🍲 **HỒ SƠ MÓN ĂN: %s**\n", dish.getName().toUpperCase()));
        sb.append(String.format("• **Mã món**: `%s` | **Danh mục**: %s\n", dish.getCode() != null ? dish.getCode() : "N/A", getCategoryNameSafe(dish)));
        sb.append(String.format("• **Giá niêm yết**: %,d đ\n", dish.getPrice().longValue()));
        if (dish.getDescription() != null && !dish.getDescription().isEmpty()) {
            sb.append(String.format("• **Hương vị & Mô tả**: %s\n", dish.getDescription()));
        }
        if (dish.getIngredients() != null && !dish.getIngredients().isEmpty()) {
            sb.append(String.format("• **Thành phần nguyên liệu**: %s\n", dish.getIngredients()));
        }
        int spicy = dish.getSpicyLevel() != null ? dish.getSpicyLevel() : 0;
        sb.append(String.format("• **Độ cay**: Cấp độ %d/5 (%s)%s\n",
                spicy, spicy == 0 ? "Không cay" : (spicy == 1 ? "Cay nhẹ" : "Cay vừa/nồng"),
                Boolean.TRUE.equals(dish.getSpicyVerified()) ? " [Bếp đã thẩm định]" : ""));
        sb.append(String.format("• **Chế độ ăn**: %s\n", Boolean.TRUE.equals(dish.getIsVegetarian()) ? "Món thuần chay 🥗" : "Món mặn 🥩"));
        String allergenInfo = dish.getAllergens() != null && !dish.getAllergens().isEmpty() ? dish.getAllergens() : "Không có chất dị ứng phổ biến";
        sb.append(String.format("• **Cảnh báo dị ứng**: %s%s\n", allergenInfo, Boolean.TRUE.equals(dish.getAllergenVerified()) ? " [Đã kiểm định]" : ""));
        String periodInfo = dish.getMealPeriods() != null
                ? dish.getMealPeriods().replace("MORNING", "Sáng").replace("NOON", "Trưa").replace("EVENING", "Tối")
                : "Cả ngày";
        sb.append(String.format("• **Khung giờ phục vụ**: %s\n", periodInfo));
        if (Boolean.TRUE.equals(dish.getIsBestSeller())) {
            sb.append("• **Đặc trưng**: ⭐ Top Best-Seller được yêu thích nhất\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        boolean isAvailable = isDishAvailableNow(dish);
        if (isAvailable) {
            sb.append("Quý khách có thể bấm **'Thêm giỏ'** ngay bên dưới để nhà bếp chuẩn bị món ăn tươi ngon nhất cho quý khách nhé!");
        } else {
            String periodNote = MealPeriodHelper.getPeriodDescription(dish.getMealPeriods());
            sb.append(String.format("*(⚠️ **Lưu ý**: Món **%s** hiện tại chưa được mở bán (hết thời gian phục vụ ca này). Quý khách vui lòng quay lại vào giờ **%s** nhé!)*", dish.getName(), periodNote));
        }

        return AiChatResponse.builder()
                .reply(sb.toString().trim())
                .recommendedDishes(Collections.singletonList(toDishDto(dish)))
                .modelUsed("Dish-Information-Engine")
                .build();
    }

    /**
     * Định danh món ăn mục tiêu cho truy vấn thông tin món
     */
    public static MenuItemEntity findTargetDishForInquiry(String norm, List<ChatMessageDto> history, List<MenuItemEntity> items) {
        if (items == null || items.isEmpty()) return null;

        // 0. Nếu khách hỏi món ngoại thực đơn rõ rệt (pizza, sushi, mì ý, hamburger, tokbokki, bún đậu...)
        // thì tuyệt đối KHÔNG match nhầm sang các món có từ phụ trùng lặp (ví dụ 'pizza hải sản' không được match nhầm 'lẩu thái hải sản')
        boolean hasForeignDish = norm.contains("pizza") || norm.contains("sushi") || norm.contains("hamburger") ||
                norm.contains("spaghetti") || norm.contains("mi y") || norm.contains("my y") || norm.contains("dimsum") ||
                norm.contains("kimbap") || norm.contains("tokbokki") || norm.contains("bun dau");
        if (hasForeignDish) {
            boolean menuHasForeignDish = false;
            for (MenuItemEntity item : items) {
                String iName = removeAccents(item.getName()).toLowerCase();
                if ((norm.contains("pizza") && iName.contains("pizza")) ||
                    (norm.contains("sushi") && iName.contains("sushi")) ||
                    (norm.contains("hamburger") && iName.contains("hamburger")) ||
                    (norm.contains("dimsum") && iName.contains("dimsum")) ||
                    (norm.contains("bun dau") && iName.contains("bun dau"))) {
                    menuHasForeignDish = true;
                    break;
                }
            }
            if (!menuHasForeignDish) {
                return null;
            }
        }

        MenuItemEntity bestMatch = null;
        int maxScore = 0;

        // 1. Khớp theo mã món (Code)
        for (MenuItemEntity item : items) {
            if (item.getCode() != null && !item.getCode().isEmpty()) {
                if (norm.contains(item.getCode().toLowerCase())) {
                    return item;
                }
            }
        }

        // 2. Khớp theo tên đầy đủ (Exact Full Name Match)
        for (MenuItemEntity item : items) {
            String iName = removeAccents(item.getName()).toLowerCase();
            if (norm.contains(iName)) {
                int score = 100 + iName.length();
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = item;
                }
            }
        }
        if (bestMatch != null) return bestMatch;

        // 3. Khớp theo cụm từ đặc trưng (Distinct Sub-phrases)
        for (MenuItemEntity item : items) {
            String iName = removeAccents(item.getName()).toLowerCase();
            int score = 0;

            String[] words = iName.split("\\s+");
            for (int i = 0; i < words.length - 1; i++) {
                String phrase = words[i] + " " + words[i + 1];
                if (phrase.equals("set lau") || phrase.equals("dia lon") || phrase.equals("phan lon") ||
                    phrase.equals("dac biet") || phrase.equals("hai san") || phrase.equals("thit bo") ||
                    phrase.equals("thit ga") || phrase.equals("thit heo") || phrase.equals("cot dua") ||
                    phrase.equals("nau la") || phrase.equals("phu yen") || phrase.equals("nam huong")) {
                    continue;
                }
                if (norm.contains(phrase)) {
                    score += 20;
                }
            }

            if (iName.contains("lau thai") && (norm.contains("lau thai") || norm.contains("tomyum"))) score += 30;
            if (iName.contains("la e") && (norm.contains("la e") || (norm.contains("lau ga") && norm.contains("la e")))) score += 30;
            if (iName.contains("rieu cua") && norm.contains("rieu cua")) score += 30;
            if (iName.contains("pho bo") && norm.contains("pho bo")) score += 30;
            if (iName.contains("pho ga") && norm.contains("pho ga")) score += 30;
            if (iName.contains("com tam") && norm.contains("com tam")) score += 30;
            if (iName.contains("bun cha") && norm.contains("bun cha")) score += 30;
            if (iName.contains("banh mi chao") && norm.contains("banh mi chao")) score += 30;
            if (iName.contains("heo quay") && norm.contains("heo quay")) score += 30;
            if (iName.contains("nem ran") && norm.contains("nem ran")) score += 30;
            if (iName.contains("ngo sen") && norm.contains("ngo sen")) score += 30;
            if (iName.contains("tra sen") && norm.contains("tra sen")) score += 30;
            if (iName.contains("ca phe") && norm.contains("ca phe")) score += 30;
            if (iName.contains("u muoi") && norm.contains("u muoi")) score += 30;
            if (iName.contains("bo to") && norm.contains("bo to")) score += 30;
            if (iName.contains("rau rung") && norm.contains("rau rung")) score += 30;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = item;
            }
        }
        if (bestMatch != null && maxScore >= 20) return bestMatch;

        // 4. Nếu khách dùng đại từ quy chiếu ("món này", "món đó", "món đề xuất")
        if (norm.contains("nay") || norm.contains("do") || norm.contains("tren") || norm.contains("de xuat") || norm.contains("vua goi y")) {
            if (history != null && !history.isEmpty()) {
                for (int i = history.size() - 1; i >= 0; i--) {
                    ChatMessageDto msg = history.get(i);
                    if (msg != null && msg.getContent() != null) {
                        String histNorm = removeAccents(msg.getContent()).toLowerCase();
                        for (MenuItemEntity item : items) {
                            String iName = removeAccents(item.getName()).toLowerCase();
                            if (histNorm.contains(iName)) {
                                if (norm.contains("lau") && !iName.contains("lau")) continue;
                                if (norm.contains("pho") && !iName.contains("pho")) continue;
                                if (norm.contains("nuoc") && !removeAccents(getCategoryNameSafe(item)).contains("uong")) continue;
                                return item;
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    private String extractRequestedDishName(String rawMessage, String norm) {
        if (rawMessage == null) return "";
        Pattern p = Pattern.compile("(?i)(?:quan co|o day co|nha hang co|co ban|co phuc vu|mon)\\s+([^?.,!]+?)(?:\\s+(?:khong|ko|chua|gia bao nhieu|bao tien)|$)");
        Matcher m = p.matcher(rawMessage);
        if (m.find()) {
            String extracted = m.group(1).trim();
            if (!extracted.isEmpty() && extracted.length() <= 35) {
                return extracted;
            }
        }
        return "";
    }

    /**
     * Handler dị ứng đơn thuần (không kèm ngân sách/voucher/thanh toán)
     */
    private AiChatResponse generateAllergyOnlyResponse(String norm, List<MenuItemEntity> items,
            AllergyProfile profile, int partySize) {

        List<MenuItemEntity> safeDishes = items.stream()
                .filter(i -> isDishSafeForProfile(i, profile))
                .collect(Collectors.toList());

        List<MenuItemEntity> safeFoods = safeDishes.stream()
                .filter(i -> !removeAccents(getCategoryNameSafe(i)).contains("uong") && !removeAccents(getCategoryNameSafe(i)).contains("trang mieng"))
                .collect(Collectors.toList());

        List<MenuItemEntity> safeDrinks = safeDishes.stream()
                .filter(i -> removeAccents(getCategoryNameSafe(i)).contains("uong") || removeAccents(getCategoryNameSafe(i)).contains("trang mieng"))
                .collect(Collectors.toList());

        String bannedListStr = String.join(", ", profile.getMentionedAllergens());
        List<MenuItemEntity> matchedItems = new ArrayList<>();

        if (safeFoods.isEmpty()) {
            String reply = String.format("Dạ em đã ghi nhận thông tin quý khách cần kiêng khem nghiêm ngặt đối với **%s**.\n\n"
                    + "Hiện tại các món trong thực đơn hôm nay có thể chứa thành phần hoặc chế biến chung trong khu vực liên quan. Để bảo đảm an toàn cho sức khỏe, quý khách vui lòng trao đổi trực tiếp với nhân viên phục vụ để bếp trưởng chuẩn bị món ăn được chế biến riêng biệt nhé!",
                    bannedListStr);
            return AiChatResponse.builder()
                    .reply(reply + getAllergySafetyDisclaimer())
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        List<MenuItemEntity> chosenFoods = safeFoods.stream()
                .sorted((a, b) -> {
                    int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                    int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                    return Integer.compare(b2, b1);
                })
                .limit(partySize == 2 ? 3 : 2)
                .collect(Collectors.toList());

        MenuItemEntity chosenDrink = safeDrinks.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()))
                .findFirst()
                .orElse(!safeDrinks.isEmpty() ? safeDrinks.get(0) : null);

        matchedItems.addAll(chosenFoods);
        if (chosenDrink != null && matchedItems.size() < 4) matchedItems.add(chosenDrink);

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Dạ em đã ghi nhận thông tin quý khách có tiền sử dị ứng với **%s** ạ.\n\n", bannedListStr));
        sb.append("OmniBot đã sàng lọc toàn bộ thực đơn và loại bỏ tất cả các món chứa nguyên liệu trên. Em xin gợi ý các món ăn thơm ngon, thanh khiết phù hợp nhất:\n\n");

        for (int idx = 0; idx < chosenFoods.size(); idx++) {
            MenuItemEntity f = chosenFoods.get(idx);
            sb.append(String.format("%d. **%s** (%,d đ): %s\n",
                    idx + 1, f.getName(), f.getPrice().longValue(),
                    f.getDescription() != null ? f.getDescription() : "Món ăn thanh đạm, giàu dinh dưỡng"));
        }
        if (chosenDrink != null) {
            sb.append(String.format("\nKèm thức uống: **%s** (%,d đ) thanh mát cân bằng vị giác.\n",
                    chosenDrink.getName(), chosenDrink.getPrice().longValue()));
        }
        sb.append("\nQuý khách bấm 'Thêm giỏ' bên dưới để dùng bữa. Vui lòng dặn nhân viên phục vụ khi lên món để bếp chế biến riêng, tránh nhiễm chéo nhé!");
        sb.append(getAllergySafetyDisclaimer());

        return AiChatResponse.builder()
                .reply(sb.toString())
                .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                .modelUsed("Rule-Based Assistant")
                .build();
    }

    public String buildMealPeriodActionOrNotice(List<MenuItemEntity> matchedItems) {
        if (matchedItems == null || matchedItems.isEmpty()) return "";

        List<MenuItemEntity> available = matchedItems.stream().filter(this::isDishAvailableNow).collect(Collectors.toList());
        List<MenuItemEntity> unavailable = matchedItems.stream().filter(i -> !this.isDishAvailableNow(i)).collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();

        if (unavailable.isEmpty()) {
            sb.append("Quý khách bấm **'Thêm giỏ'** các món trên để nhà bếp chuẩn bị nguyên liệu và phục vụ tươi ngon nhất nhé!");
        } else if (available.isEmpty()) {
            sb.append("⚠️ **Lưu ý**: Các món trên hiện **chưa được mở bán** ở ca hiện tại. Quý khách vui lòng quay lại vào khung giờ sau để thưởng thức nhé:\n");
            for (MenuItemEntity item : unavailable) {
                String periodNote = MealPeriodHelper.getPeriodDescription(item.getMealPeriods());
                sb.append(String.format("• **%s**: Vui lòng quay lại vào giờ **%s**\n", item.getName(), periodNote));
            }
        } else {
            sb.append("Quý khách có thể bấm **'Thêm giỏ'** cho các món đang mở bán để thưởng thức ngay.\n\n");
            sb.append("⚠️ **Lưu ý**: Một số món chưa được mở bán, quý khách vui lòng quay lại vào khung giờ sau:\n");
            for (MenuItemEntity item : unavailable) {
                String periodNote = MealPeriodHelper.getPeriodDescription(item.getMealPeriods());
                sb.append(String.format("• **%s**: Vui lòng quay lại vào giờ **%s**\n", item.getName(), periodNote));
            }
        }
        return sb.toString().trim();
    }

    private AiChatResponse generateRuleBasedResponse(String message, List<MenuItemEntity> items) {
        return generateRuleBasedResponse(message, items, null);
    }

    private AiChatResponse generateRuleBasedResponse(String message, List<MenuItemEntity> items, List<ChatMessageDto> history) {
        String norm = removeAccents(message);
        List<MenuItemEntity> matchedItems = new ArrayList<>();
        String reply;

        AllergyProfile profile = detectAllergyProfile(norm);

        // 0. KIỂM TRA THÀNH PHẦN / DỊ ỨNG CỦA MÓN ĂN CỤ THỂ
        if (isDishIngredientCheckQuery(norm)) {
            return handleDishIngredientCheck(message, norm, history, items, profile);
        }

        // 0.1 HỎI BẤT KỲ THÔNG TIN NÀO VỀ MÓN ĂN
        if (isDishInquiryQuery(norm, items, history)) {
            return handleDishInquiry(message, norm, history, items);
        }

        // Danh sách toàn bộ thực đơn và danh sách món đang mở bán hiện tại
        List<MenuItemEntity> allItems = items;
        List<MenuItemEntity> servingItems = items.stream()
                .filter(this::isDishAvailableNow)
                .collect(Collectors.toList());

        MealPeriod currentPeriod = MealPeriodHelper.getCurrentPeriod(getCurrentTime());
        if (servingItems.isEmpty() && currentPeriod == MealPeriod.closed && enforceBusinessHours) {
            return AiChatResponse.builder()
                    .reply("Dạ hiện tại nhà hàng OmniResto đang trong khung giờ nghỉ đêm (22:00 - 06:00) và tạm dừng nhận đặt món trực tuyến ạ.\n\nNhà hàng sẽ mở cửa đón tiếp quý khách vào lúc 06:00 sáng mai với thực đơn bữa sáng nóng hổi. Quý khách có thể xem trước thực đơn hoặc quay lại vào sáng mai để đặt món nhé!")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // Với các câu hỏi gợi ý chung (bàn 2 người, ngân sách, rẻ nhất...), ưu tiên dùng servingItems
        List<MenuItemEntity> generalPool = !servingItems.isEmpty() ? servingItems : allItems;

        int partySize = detectPartySize(norm);
        long budget = extractBudgetFromText(norm);
        boolean wantsVoucher = detectVoucherIntent(norm);
        boolean wantsPayment = detectPaymentIntent(norm);
        boolean isDateNight = norm.contains("hen ho") || norm.contains("lang man") || norm.contains("am cung") ||
                norm.contains("ban gai") || norm.contains("nguoi yeu") || norm.contains("1 nguoi nua");

        // 1. Chào hỏi
        if (isGreetingQuery(norm)) {
            return AiChatResponse.builder()
                    .reply("Dạ em chào quý khách ạ! Rất vui được đón tiếp quý khách tại OmniResto.\n\nQuý khách hôm nay đi mấy người, và mình đang muốn tìm món ăn no, món thanh đạm ăn nhẹ hay cần gợi ý theo ngân sách? Em sẵn sàng tư vấn ngay cho mình ạ!")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // ==============================================================
        // DETECT: CÓ PHẢI MULTI-INTENT QUERY KHÔNG?
        // Nếu query chứa nhiều intent (dị ứng + ngân sách + voucher/thanh toán/hẹn hò)
        // → KHÔNG return sớm, xử lý tất cả trong 1 response có cấu trúc rõ ràng
        // ==============================================================
        boolean hasAllergyIntent = profile.hasAnyRestriction() && (
                norm.contains("di ung") || norm.contains("kieng") || norm.contains("khong an") ||
                norm.contains("ko an") || norm.contains("man ngua") || norm.contains("tranh") ||
                norm.contains("so bi") || norm.contains("khong an duoc") || norm.contains("ko an duoc")
        );

        // Đếm số lượng ý định độc lập trong câu hỏi
        int intentCount = 0;
        if (hasAllergyIntent) intentCount++;
        if (budget > 0) intentCount++;
        if (wantsVoucher) intentCount++;
        if (wantsPayment) intentCount++;
        if (partySize > 0 || isDateNight) intentCount++;

        boolean isMultiIntent = intentCount >= 2;

        log.info("🤖 [RULE-BASED-DEBUG] hasAllergyIntent={}, isMultiIntent={}, intentCount={}, partySize={}, budget={}, wantsVoucher={}, wantsPayment={}, isDateNight={}, isDrinkQuery={}",
                hasAllergyIntent, isMultiIntent, intentCount, partySize, budget, wantsVoucher, wantsPayment, isDateNight, isDrinkQuery(norm));

        if (isMultiIntent) {
            // Điều hướng sang handler đa năng — trả lời đầy đủ tất cả intent trong 1 response
            return generateMultiIntentResponse(message, norm, items, profile, partySize, budget,
                    wantsVoucher, wantsPayment, isDateNight);
        }

        // ==============================================================
        // ƯU TIÊN 1: DỊ ỨNG đơn thuần (ALLERGY-ONLY SAFETY HANDLER)
        // Nếu khách hỏi danh mục cụ thể (lẩu, phở, cơm, bún, bánh mì), hãy để Category Engine xử lý
        // ==============================================================
        boolean hasCategoryIntent = norm.contains("lau") || (norm.contains("pho") && !norm.contains("pho mai")) ||
                (norm.contains("com") && !norm.contains("combo")) || norm.contains("bun") || norm.contains("banh mi");

        if (hasAllergyIntent && !hasCategoryIntent) {
            return generateAllergyOnlyResponse(norm, generalPool, profile, partySize);
        }


        // ==============================================================
        // ƯU TIÊN 2: BÀN 2 NGƯỜI / CẶP ĐÔI (COUPLES & 2 GUESTS HANDLER)
        // ==============================================================
        if (partySize == 2) {
            // Lọc các món an toàn theo profile (nếu khách có kiêng gì)
            List<MenuItemEntity> pool = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .collect(Collectors.toList());

            // 1 món khai vị / món ăn chung chia sẻ (ưu tiên danh mục Khai vị & Ăn nhẹ)
            MenuItemEntity appetizer = pool.stream()
                    .filter(i -> {
                        String cat = removeAccents(getCategoryNameSafe(i));
                        String n = removeAccents(i.getName());
                        return cat.contains("khai vi") || cat.contains("an nhe") || n.startsWith("goi ") || n.startsWith("nom ") || n.contains("khoai tay");
                    })
                    .findFirst()
                    .orElse(null);

            // 2 món chính tròn vị (cơm / phở / bún / lẩu) - không trùng với khai vị và đồ uống
            List<MenuItemEntity> mainDishes = pool.stream()
                    .filter(i -> {
                        String cat = removeAccents(getCategoryNameSafe(i));
                        if (cat.contains("khai vi") || cat.contains("an nhe") || cat.contains("uong") || cat.contains("trang mieng")) {
                            return false;
                        }
                        return cat.contains("pho") || cat.contains("bun") || cat.contains("com") || cat.contains("chinh") || cat.contains("lau") || cat.contains("mon man");
                    })
                    .limit(2)
                    .collect(Collectors.toList());

            // 1 thức uống thanh nhiệt (chỉ lấy danh mục Đồ uống hoặc trà / cà phê / nước ép)
            MenuItemEntity drink = pool.stream()
                    .filter(i -> {
                        String cat = removeAccents(getCategoryNameSafe(i));
                        String n = removeAccents(i.getName());
                        return cat.contains("uong") || cat.contains("giai khat") ||
                                n.startsWith("tra ") || n.contains(" tra ") ||
                                n.startsWith("ca phe") || n.contains(" ca phe") ||
                                n.startsWith("nuoc ep");
                    })
                    .findFirst()
                    .orElse(null);

            if (appetizer != null) matchedItems.add(appetizer);
            matchedItems.addAll(mainDishes);
            if (drink != null) matchedItems.add(drink);

            // Nếu không đủ món theo phân loại, lấy món trong pool
            if (matchedItems.isEmpty()) {
                matchedItems = pool.stream().limit(3).collect(Collectors.toList());
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ với bàn 2 người, để bữa ăn vừa vặn khẩu phần, trọn vẹn hương vị mà không bị ngấy, OmniBot xin gợi ý thực đơn lý tưởng kết hợp hài hòa cho 2 quý khách:\n\n");

            if (appetizer != null) {
                sb.append(String.format("1. **Khai vị chia sẻ**: **%s** (%s đ) - Giòn mát, chua thanh nhẹ kích thích vị giác đầu bữa.\n",
                        appetizer.getName(), String.format("%,d", appetizer.getPrice().longValue())));
            }
            if (!mainDishes.isEmpty()) {
                sb.append("2. **Món chính thưởng thức**:\n");
                for (MenuItemEntity md : mainDishes) {
                    sb.append(String.format("   - **%s** (%s đ): %s\n",
                            md.getName(), String.format("%,d", md.getPrice().longValue()),
                            md.getDescription() != null ? md.getDescription() : "Đậm đà hương vị truyền thống"));
                }
            }
            if (drink != null) {
                sb.append(String.format("3. **Thức uống dùng kèm**: **%s** (%s đ) - Thơm ngon thanh mát giúp giải ngấy hoàn hảo.\n",
                        drink.getName(), String.format("%,d", drink.getPrice().longValue())));
            }
            sb.append("\nQuý khách có thể bấm **'Thêm giỏ'** bên dưới các món ưa thích để bếp bắt đầu chế biến cho 2 bạn nhé!");

            if (profile.hasAnyRestriction()) {
                sb.append(getAllergySafetyDisclaimer());
            }

            return AiChatResponse.builder()
                    .reply(sb.toString())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Rule-Based Assistant")
                    .build();
        }

        // ==============================================================
        // 2. Ý định Ngân sách & Combo món mặn + nước
        // ==============================================================
        long extractedBudget = extractBudgetFromText(norm);
        boolean wantsCombo = (norm.contains("mon man") || norm.contains("mon an") || norm.contains("com") ||
                norm.contains("banh mi") || norm.contains("pho") || norm.contains("xoi")) &&
                (norm.contains("uong") || norm.contains("nuoc") || norm.contains("tra") || norm.contains("ca phe"));

        if (extractedBudget > 0 || (wantsCombo && (norm.contains("ngan sach") || norm.contains("tien") || norm.contains("k")))) {
            long targetBudget = extractedBudget > 0 ? extractedBudget : 100000;

            List<MenuItemEntity> foods = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> !removeAccents(getCategoryNameSafe(i)).contains("uong"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(getCategoryNameSafe(i)).contains("uong"))
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
                                "1. **Món chính**: **%s** (%s đ)\n" +
                                "2. **Đồ uống**: **%s** (%s đ)\n\n" +
                                "**Tổng cộng**: **%s đ**%s.\n\n" +
                                "Mời quý khách bấm **Thêm giỏ** bên dưới cho cả 2 món để thưởng thức bữa ăn ngon miệng nhé!",
                        String.format("%,d", targetBudget), foodName, foodPrice, drinkName, drinkPrice, totalStr,
                        change > 0 ? String.format(" (vẫn còn dư **%s đ** trong ngân sách)", changeStr) : "");

                if (profile.hasAnyRestriction()) {
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
            List<MenuItemEntity> foods = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> !removeAccents(getCategoryNameSafe(i)).contains("uong"))
                    .sorted(Comparator.comparing(MenuItemEntity::getPrice, Comparator.nullsLast(BigDecimal::compareTo)))
                    .collect(Collectors.toList());

            List<MenuItemEntity> drinks = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(getCategoryNameSafe(i)).contains("uong"))
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

            reply = String.format("Dạ món ăn có mức giá tiết kiệm và bình dân nhất của quán hiện tại là **%s** chỉ với **%s đ** ạ!\n\nVề thức uống thì có **%s** (%s đ). Toàn bộ món đều được chế biến từ nguyên liệu tươi mới trong ngày. Mời quý khách bấm 'Thêm giỏ' bên dưới để dùng thử nhé!",
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
            generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .sorted((a, b) -> b.getPrice().compareTo(a.getPrice()))
                    .findFirst()
                    .ifPresent(matchedItems::add);

            MenuItemEntity topDish = !matchedItems.isEmpty() ? matchedItems.get(0) : null;
            String name = topDish != null ? topDish.getName() : "";
            String price = topDish != null ? String.format("%,d", topDish.getPrice().longValue()) : "0";

            reply = String.format("Dạ món ăn thượng hạng và đầy đặn nhất của quán là **%s** (%s đ) ạ!\n\nĐây là set ăn rất được ưa chuộng cho các bàn tiệc sum vầy hoặc gia đình. Quý khách bấm 'Thêm giỏ' ngay bên dưới để bếp chuẩn bị nhé!",
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
            reply = "Dạ với quý khách dùng món thanh đạm hoặc món chay, bếp OmniResto có các món chế biến từ nếp nương, hạt sen và rau nấm tươi mát. Nếu quý khách có yêu cầu ăn chay nghiêm ngặt, vui lòng báo nhân viên phục vụ để bếp lưu ý chế biến riêng nhé!";
        } else if (norm.contains("khong cay") || norm.contains("ko cay") || norm.contains("tre em") || norm.contains("em be") || norm.contains("be")) {
            matchedItems = items.stream()
                    .filter(i -> (i.getSpicyLevel() == null || i.getSpicyLevel() == 0) &&
                            (removeAccents(i.getName()).contains("pho") ||
                                    removeAccents(i.getName()).contains("com tam") ||
                                    removeAccents(i.getName()).contains("xoi") ||
                                    removeAccents(i.getName()).contains("banh cuon")))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ đây là các món có vị thanh ngọt tự nhiên từ nước hầm xương và không nêm ớt cay. Để phù hợp nhất cho bé hoặc người không ăn được cay, bạn vui lòng dặn thêm nhân viên phục vụ ghi chú không tiêu ớt khi lên món nhé:";
        } else if (norm.contains("lau")) {
            // Danh mục Lẩu: BẮT BUỘC chỉ chọn các món thực sự là LẨU (tên món chứa 'lau') từ toàn bộ thực đơn allItems
            matchedItems = allItems.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("lau"))
                    .sorted((a, b) -> {
                        int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(b2, b1);
                    })
                    .limit(3)
                    .collect(Collectors.toList());

            if (matchedItems.isEmpty()) {
                if (profile.hasAnyRestriction()) {
                    String bannedListStr = String.join(", ", profile.getMentionedAllergens());
                    String msg = String.format("Dạ em đã ghi nhận thông tin quý khách cần kiêng khem nghiêm ngặt đối với **%s** ạ.\n\n"
                            + "Hiện tại các món lẩu trong thực đơn hôm nay đều có thành phần liên quan hoặc chế biến chung trong khu vực chứa nguyên liệu trên. Để bảo đảm tuyệt đối an toàn cho sức khỏe, quý khách vui lòng tham khảo các món ăn khác hoặc trao đổi trực tiếp với nhân viên phục vụ để bếp trưởng chuẩn bị nước lẩu được chế biến riêng nhé!",
                            bannedListStr);
                    return AiChatResponse.builder()
                            .reply(msg + getAllergySafetyDisclaimer())
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Food-Category-Engine")
                            .build();
                } else {
                    // Tìm kiếm phụ qua mô tả (chỉ món thực sự liên quan đến lẩu), tuyệt đối KHÔNG lấy món nhắm ăn kèm
                    matchedItems = allItems.stream()
                            .filter(i -> isDishSafeForProfile(i, profile))
                            .filter(i -> removeAccents(i.getDescription()).contains("lau"))
                            .limit(3)
                            .collect(Collectors.toList());
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ OmniResto xin gợi ý các món lẩu nóng hổi trứ danh, nước dùng ninh hầm ngọt thanh đậm đà rất được lòng thực khách ạ:\n\n");
            for (int idx = 0; idx < matchedItems.size(); idx++) {
                MenuItemEntity h = matchedItems.get(idx);
                sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, h.getName(), h.getPrice().longValue(),
                        h.getDescription() != null ? h.getDescription() : "Nước lẩu đậm vị truyền thống, ngập tràn topping tươi ngon tuyển chọn"));
            }
            sb.append("\n\n").append(buildMealPeriodActionOrNotice(matchedItems));
            if (hasAllergyOrDietMention(norm)) {
                sb.append(getAllergySafetyDisclaimer());
            }
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Food-Category-Engine")
                    .build();

        } else if (norm.contains("pho") && !norm.contains("pho mai")) {
            // Danh mục Phở: BẮT BUỘC lọc món có tên chứa 'pho' từ allItems
            matchedItems = allItems.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("pho"))
                    .sorted((a, b) -> {
                        int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(b2, b1);
                    })
                    .limit(3)
                    .collect(Collectors.toList());

            if (matchedItems.isEmpty()) {
                if (profile.hasAnyRestriction()) {
                    String bannedListStr = String.join(", ", profile.getMentionedAllergens());
                    String msg = String.format("Dạ em đã ghi nhận thông tin quý khách cần kiêng khem đối với **%s** ạ.\n\n"
                            + "Hiện tại các món phở trong thực đơn hôm nay đều có thành phần liên quan đến nguyên liệu trên. Quý khách vui lòng tham khảo món khác hoặc báo nhân viên phục vụ để bếp lưu ý chế biến riêng nhé!",
                            bannedListStr);
                    return AiChatResponse.builder()
                            .reply(msg + getAllergySafetyDisclaimer())
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Food-Category-Engine")
                            .build();
                } else {
                    matchedItems = allItems.stream()
                            .filter(i -> isDishSafeForProfile(i, profile))
                            .filter(i -> removeAccents(i.getDescription()).contains("pho"))
                            .limit(3)
                            .collect(Collectors.toList());
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ OmniResto xin gợi ý các món phở truyền thống thơm ngon đậm đà, nước dùng hầm xương ngọt thanh tự nhiên sau đây ạ:\n\n");
            for (int idx = 0; idx < matchedItems.size(); idx++) {
                MenuItemEntity p = matchedItems.get(idx);
                sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, p.getName(), p.getPrice().longValue(),
                        p.getDescription() != null ? p.getDescription() : "Phở đậm vị truyền thống"));
            }
            sb.append("\n\n").append(buildMealPeriodActionOrNotice(matchedItems));
            if (hasAllergyOrDietMention(norm)) {
                sb.append(getAllergySafetyDisclaimer());
            }
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Food-Category-Engine")
                    .build();

        } else if (norm.contains("com") && !norm.contains("combo")) {
            // Danh mục Cơm: BẮT BUỘC lọc món có tên chứa 'com' từ allItems
            matchedItems = allItems.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("com"))
                    .sorted((a, b) -> {
                        int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(b2, b1);
                    })
                    .limit(3)
                    .collect(Collectors.toList());

            if (matchedItems.isEmpty()) {
                if (profile.hasAnyRestriction()) {
                    String bannedListStr = String.join(", ", profile.getMentionedAllergens());
                    String msg = String.format("Dạ em đã ghi nhận quý khách cần kiêng khem đối với **%s** ạ.\n\n"
                            + "Hiện tại các món cơm đều có thành phần liên quan đến nguyên liệu trên. Quý khách vui lòng tham khảo các món khác hoặc dặn nhân viên phục vụ để bếp chế biến riêng nhé!",
                            bannedListStr);
                    return AiChatResponse.builder()
                            .reply(msg + getAllergySafetyDisclaimer())
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Food-Category-Engine")
                            .build();
                } else {
                    matchedItems = allItems.stream()
                            .filter(i -> isDishSafeForProfile(i, profile))
                            .filter(i -> removeAccents(i.getDescription()).contains("com"))
                            .limit(3)
                            .collect(Collectors.toList());
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ OmniResto có các món cơm thơm dẻo, đậm đà chuẩn vị sau đây dành cho quý khách:\n\n");
            for (int idx = 0; idx < matchedItems.size(); idx++) {
                MenuItemEntity c = matchedItems.get(idx);
                sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, c.getName(), c.getPrice().longValue(),
                        c.getDescription() != null ? c.getDescription() : "Món cơm chuẩn vị thơm ngon"));
            }
            sb.append("\n\n").append(buildMealPeriodActionOrNotice(matchedItems));
            if (hasAllergyOrDietMention(norm)) {
                sb.append(getAllergySafetyDisclaimer());
            }
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Food-Category-Engine")
                    .build();

        } else if (norm.contains("bun")) {
            // Danh mục Bún: BẮT BUỘC lọc món có tên chứa 'bun' từ allItems
            matchedItems = allItems.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("bun"))
                    .sorted((a, b) -> {
                        int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(b2, b1);
                    })
                    .limit(3)
                    .collect(Collectors.toList());

            if (matchedItems.isEmpty()) {
                if (profile.hasAnyRestriction()) {
                    String bannedListStr = String.join(", ", profile.getMentionedAllergens());
                    String msg = String.format("Dạ em đã ghi nhận quý khách cần kiêng khem đối với **%s** ạ.\n\n"
                            + "Hiện tại các món bún đều có thành phần liên quan đến nguyên liệu trên. Quý khách vui lòng tham khảo các món khác hoặc dặn nhân viên phục vụ để bếp chế biến riêng nhé!",
                            bannedListStr);
                    return AiChatResponse.builder()
                            .reply(msg + getAllergySafetyDisclaimer())
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Food-Category-Engine")
                            .build();
                } else {
                    matchedItems = allItems.stream()
                            .filter(i -> isDishSafeForProfile(i, profile))
                            .filter(i -> removeAccents(i.getDescription()).contains("bun"))
                            .limit(3)
                            .collect(Collectors.toList());
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ OmniResto có các món bún thơm ngon đậm đà đặc sắc sau đây ạ:\n\n");
            for (int idx = 0; idx < matchedItems.size(); idx++) {
                MenuItemEntity b = matchedItems.get(idx);
                sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, b.getName(), b.getPrice().longValue(),
                        b.getDescription() != null ? b.getDescription() : "Bún đậm đà phong vị truyền thống"));
            }
            sb.append("\n\n").append(buildMealPeriodActionOrNotice(matchedItems));
            if (hasAllergyOrDietMention(norm)) {
                sb.append(getAllergySafetyDisclaimer());
            }
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Food-Category-Engine")
                    .build();

        } else if (norm.contains("banh mi")) {
            // Danh mục Bánh mì: Ưu tiên lọc món có tên chứa 'banh mi'
            matchedItems = items.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("banh mi"))
                    .sorted((a, b) -> {
                        int b1 = Boolean.TRUE.equals(a.getIsBestSeller()) ? 1 : 0;
                        int b2 = Boolean.TRUE.equals(b.getIsBestSeller()) ? 1 : 0;
                        return Integer.compare(b2, b1);
                    })
                    .limit(3)
                    .collect(Collectors.toList());

            if (matchedItems.isEmpty()) {
                if (profile.hasAnyRestriction()) {
                    String bannedListStr = String.join(", ", profile.getMentionedAllergens());
                    String msg = String.format("Dạ em đã ghi nhận quý khách cần kiêng khem đối với **%s** ạ.\n\n"
                            + "Hiện tại các món bánh mì đều có thành phần liên quan đến nguyên liệu trên. Quý khách vui lòng tham khảo các món khác hoặc dặn nhân viên phục vụ để bếp chế biến riêng nhé!",
                            bannedListStr);
                    return AiChatResponse.builder()
                            .reply(msg + getAllergySafetyDisclaimer())
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Food-Category-Engine")
                            .build();
                } else {
                    matchedItems = items.stream()
                            .filter(i -> removeAccents(getCategoryNameSafe(i)).contains("banh mi"))
                            .limit(3)
                            .collect(Collectors.toList());
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Dạ OmniResto có các món bánh mì giòn rụm, nhân đậm vị sau đây dành cho quý khách:\n\n");
            for (int idx = 0; idx < matchedItems.size(); idx++) {
                MenuItemEntity bm = matchedItems.get(idx);
                sb.append(String.format("%d. **%s** (%,d đ): %s\n", idx + 1, bm.getName(), bm.getPrice().longValue(),
                        bm.getDescription() != null ? bm.getDescription() : "Bánh mì giòn rụm thơm lừng"));
            }
            sb.append("\n\n").append(buildMealPeriodActionOrNotice(matchedItems));
            if (hasAllergyOrDietMention(norm)) {
                sb.append(getAllergySafetyDisclaimer());
            }
            return AiChatResponse.builder()
                    .reply(sb.toString().trim())
                    .recommendedDishes(matchedItems.stream().map(this::toDishDto).collect(Collectors.toList()))
                    .modelUsed("Food-Category-Engine")
                    .build();

        } else if (norm.contains("nhom") || norm.contains("combo") || norm.contains("gia dinh") || norm.contains("3 nguoi") || norm.contains("4 nguoi")) {
            matchedItems = generalPool.stream()
                    .filter(i -> isDishSafeForProfile(i, profile))
                    .filter(i -> removeAccents(i.getName()).contains("lau") ||
                            removeAccents(i.getName()).contains("bo") ||
                            removeAccents(i.getName()).contains("ga") ||
                            removeAccents(i.getName()).contains("tra"))
                    .limit(3)
                    .collect(Collectors.toList());
            reply = "Dạ với nhóm từ 3 đến 4 người hoặc gia đình, em gợi ý quý khách thưởng thức combo lẩu ấm cúng kèm món ăn kèm và nước trà thanh nhiệt sum vầy ạ!";
        } else if (isDrinkQuery(norm)) {
            matchedItems = generalPool.stream()
                    .filter(i -> removeAccents(getCategoryNameSafe(i)).contains("uong") ||
                            removeAccents(i.getName()).contains("tra") ||
                            removeAccents(i.getName()).contains("ca phe"))
                    .limit(2)
                    .collect(Collectors.toList());
            reply = "Dạ nhà hàng có các loại thức uống pha chế thủ công thanh mát và cà phê đậm đà giúp giải nhiệt và cân bằng khẩu vị cực tốt ạ:";
        } else if (norm.contains("vietqr") || norm.contains("thanh toan") || norm.contains("chuyen khoan")) {
            return AiChatResponse.builder()
                    .reply("Dạ quý khách có thể thanh toán VietQR rất nhanh chóng:\n1. Chọn mục **'Đơn hàng'** trên menu.\n2. Bấm nút **'Quét mã VietQR'**, mã QR động với số tiền chính xác sẽ hiện ra.\n3. Quét trên app ngân hàng bất kỳ, hệ thống sẽ tự động ghi nhận thanh toán sau 2–3 giây ạ!")
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        } else if (norm.contains("wifi") || norm.contains("mat khau") || norm.contains("pass")) {
            return AiChatResponse.builder()
                    .reply(String.format("Dạ mật khẩu Wifi dành cho khách của nhà hàng OmniResto là: **%s** (Tên mạng: **%s**). Chúc quý khách dùng bữa thật ngon miệng ạ!",
                            wifiPassword, wifiSsid))
                    .recommendedDishes(Collections.emptyList())
                    .modelUsed("Rule-Based Assistant")
                    .build();
        } else {
            MenuItemEntity specificDish = findTargetDishForInquiry(norm, history, allItems);
            if (specificDish != null) {
                matchedItems.add(specificDish);
                String periodNote = MealPeriodHelper.getPeriodDescription(specificDish.getMealPeriods());
                if (isDishAvailableNow(specificDish)) {
                    reply = String.format("Dạ OmniResto có món **%s** (%,d đ) rất được ưa chuộng. Mời quý khách bấm 'Thêm giỏ' bên dưới để bếp chuẩn bị nhé!",
                            specificDish.getName(), specificDish.getPrice().longValue());
                } else {
                    reply = String.format("Dạ OmniResto có phục vụ món **%s** (%,d đ) thơm ngon đặc sắc ạ!\n\n⚠️ **Lưu ý**: Món chưa được mở bán ở ca hiện tại. Quý khách vui lòng quay lại vào giờ **%s** để thưởng thức nhé!",
                            specificDish.getName(), specificDish.getPrice().longValue(), periodNote);
                }
            } else {
                matchedItems = generalPool.stream()
                        .filter(i -> isDishSafeForProfile(i, profile))
                        .filter(i -> Boolean.TRUE.equals(i.getIsBestSeller()))
                        .limit(2)
                        .collect(Collectors.toList());
                if (matchedItems.isEmpty()) {
                    matchedItems = generalPool.stream().filter(i -> isDishSafeForProfile(i, profile)).limit(2).collect(Collectors.toList());
                }
                if (matchedItems.isEmpty()) {
                    matchedItems = allItems.stream().filter(i -> isDishSafeForProfile(i, profile)).limit(2).collect(Collectors.toList());
                }
                reply = "Dạ để phục vụ đúng khẩu vị của quý khách, em xin phép gợi ý các lựa chọn tiêu biểu đang mở bán hôm nay. Quý khách bấm 'Thêm giỏ' bên dưới để trải nghiệm nhé!";
            }
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
     * Lấy thông tin voucher đang hoạt động từ DB để inject vào Gemini context.
     * Fallback về text mô tả chương trình mặc định nếu VoucherRepository không có sẵn.
     */
    private String getActiveVoucherContext() {
        try {
            if (voucherRepository != null) {
                List<VoucherEntity> activeVouchers = voucherRepository.findAvailableVouchers(LocalDateTime.now());
                if (activeVouchers != null && !activeVouchers.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    int limit = Math.min(activeVouchers.size(), 5); // chỉ hiển thị tối đa 5 voucher
                    for (int i = 0; i < limit; i++) {
                        VoucherEntity v = activeVouchers.get(i);
                        sb.append("- Mã: **").append(v.getCode()).append("**");
                        if (v.getName() != null) {
                            sb.append(" (").append(v.getName()).append(")");
                        }
                        // discountType: PERCENTAGE hoặc FIXED_AMOUNT
                        if (v.getDiscountType() != null && v.getDiscountValue() != null) {
                            if (v.getDiscountType().name().equals("PERCENTAGE")) {
                                sb.append(" | Giảm ").append(v.getDiscountValue().stripTrailingZeros().toPlainString()).append("%");
                                if (v.getMaxDiscountAmount() != null && v.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                                    sb.append(" (tối đa ").append(String.format("%,d", v.getMaxDiscountAmount().longValue())).append(" VND)");
                                }
                            } else {
                                sb.append(" | Giảm ").append(String.format("%,d", v.getDiscountValue().longValue())).append(" VND");
                            }
                        }
                        if (v.getMinOrderAmount() != null && v.getMinOrderAmount().compareTo(BigDecimal.ZERO) > 0) {
                            sb.append(" | Đơn tối thiểu: ").append(String.format("%,d", v.getMinOrderAmount().longValue())).append(" VND");
                        }
                        if (v.getDescription() != null && !v.getDescription().isEmpty()) {
                            sb.append(" | ").append(v.getDescription());
                        }
                        if (v.getEndDate() != null) {
                            sb.append(" | HSD: ").append(v.getEndDate().toLocalDate());
                        }
                        sb.append("\n");
                    }
                    return sb.toString();
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch active vouchers from DB: {}", e.getMessage());
        }
        // Fallback: mô tả chương trình khuyến mãi thường trực
        return "Hiện tại OmniResto đang triển khai các chương trình khuyến mãi sau:\n"
                + "- Thành viên mới đăng ký app: Giảm 10% đơn hàng đầu tiên (tối đa 50.000 VND).\n"
                + "- Thành viên Silver trở lên: Giảm 5% toàn bộ đơn hàng.\n"
                + "- Ngày sinh nhật: Tặng 1 món tráng miệng khi xuất trình CMND/CCCD tại quầy.\n"
                + "Để kiểm tra voucher cá nhân hoặc nhận mã ưu đãi mới nhất, quý khách vui lòng vào mục "
                + "'Ưu Đãi' trên ứng dụng hoặc hỏi nhân viên phục vụ nhé.";
    }

    /**
     * Trả về mô tả các phương thức thanh toán được hỗ trợ tại OmniResto.
     */
    private String getPaymentMethodContext() {
        return "1. VietQR (Quét mã QR động): Hỗ trợ toàn bộ app ngân hàng nội địa. "
                + "Trong ứng dụng → Đơn hàng → Quét mã VietQR → Xác nhận tự động sau 2-3 giây.\n"
                + "2. Chuyển khoản ngân hàng: STK sẽ được hiển thị trên hóa đơn.\n"
                + "3. Tiền mặt: Thanh toán trực tiếp tại quầy hoặc đưa cho nhân viên phục vụ.\n"
                + "4. Thẻ ngân hàng (ATM/Visa/Mastercard): Máy POS tại quầy thu ngân.\n"
                + "5. Ví điện tử MoMo, ZaloPay, VNPay: Quét mã tại quầy thu ngân.\n"
                + "Lưu ý: Thanh toán online qua ứng dụng OmniResto hỗ trợ VietQR và chuyển khoản. "
                + "Thẻ tín dụng và ví điện tử thanh toán tại quầy.";
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
        Matcher mCompound = Pattern.compile("(\\d+)\\s*(?:tr|trieu|tri\\?u)\\s*(\\d+)").matcher(norm);
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
        Matcher mMillion = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(?:tr|trieu|tri\\?u)\\b").matcher(norm);
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

    public static String fixMojibakeIfPresent(String text) {
        if (text == null || text.isEmpty()) return "";
        // Tự động nhận diện và khôi phục chuỗi UTF-8 bị ép qua ISO-8859-1 / Windows-1252
        if (text.contains("Ã") || text.contains("Ä") || text.contains("áº") || text.contains("á»") || text.contains("Æ") || text.contains("â€")) {
            try {
                byte[] bytes = text.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);
                String recovered = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                if (!recovered.contains("Ã") && !recovered.contains("Ä")) {
                    return recovered;
                }
            } catch (Exception ignored) {}
        }
        return text;
    }

    public static String removeAccents(String text) {
        if (text == null) return "";
        String fixed = fixMojibakeIfPresent(text);
        String normalized = Normalizer.normalize(fixed, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String clean = pattern.matcher(normalized).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase()
                .trim();
        if (clean.contains("?")) {
            clean = clean.replace("d? ung", "di ung")
                         .replace("h?i san", "hai san")
                         .replace("h?i s?n", "hai san")
                         .replace("th?t ga", "thit ga")
                         .replace("th?t", "thit")
                         .replace("tri?u", "trieu")
                         .replace("ngu?i", "nguoi")
                         .replace("gi?m", "giam");
        }
        return clean;
    }

    private AiRecommendedDishDto toDishDto(MenuItemEntity item) {
        if (item == null) return null;
        boolean availableNow = isDishAvailableNow(item);
        String note = MealPeriodHelper.getPeriodDescription(item.getMealPeriods());
        return AiRecommendedDishDto.builder()
                .id(item.getId())
                .code(item.getCode())
                .name(item.getName())
                .category(getCategoryNameSafe(item))
                .price(item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO)
                .description(item.getDescription())
                .imageUrl(item.getImageUrl())
                .isVegetarian(item.getIsVegetarian())
                .spicyLevel(item.getSpicyLevel())
                .allergens(item.getAllergens())
                .allergenVerified(item.getAllergenVerified())
                .spicyVerified(item.getSpicyVerified())
                .mealPeriods(item.getMealPeriods())
                .availableNow(availableNow)
                .mealPeriodNote(note)
                .build();
    }
}
