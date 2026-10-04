package com.omniresto.backend.controller;

import com.omniresto.backend.dto.ai.AiChatRequest;
import com.omniresto.backend.dto.ai.AiChatResponse;
import com.omniresto.backend.service.AiChatRateLimiter;
import com.omniresto.backend.service.AiChatbotService;
import com.omniresto.backend.service.TableSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiChatbotController {

    private final AiChatbotService aiChatbotService;
    private final TableSessionService tableSessionService;
    private final AiChatRateLimiter rateLimiter;

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestBody(required = false) AiChatRequest request,
            HttpServletRequest servletRequest) {

        // 1. Xác thực phiên bàn hoặc phân định khách xem menu online
        String sessionKey;
        if (sessionToken != null && !sessionToken.trim().isEmpty()) {
            try {
                tableSessionService.validateAndTouchSession(sessionToken.trim());
                sessionKey = "table:" + sessionToken.trim();
            } catch (Exception e) {
                log.warn("Invalid table session token: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                        AiChatResponse.builder()
                                .reply("Dạ phiên bàn của quý khách không còn hiệu lực hoặc đã kết thúc. Quý khách vui lòng quét lại mã QR tại bàn nhé! 📱✨")
                                .recommendedDishes(Collections.emptyList())
                                .modelUsed("Security Gateway")
                                .build()
                );
            }
        } else {
            // Khách duyệt thực đơn trực tuyến: nhận diện theo IP client
            String clientIp = servletRequest != null ? servletRequest.getRemoteAddr() : "guest";
            sessionKey = "guest:" + (clientIp != null ? clientIp : "anonymous");
        }

        // 2. Giới hạn lượt gửi (Rate Limiting)
        if (!rateLimiter.tryAcquire(sessionKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                    AiChatResponse.builder()
                            .reply("Dạ quý khách gửi tin nhắn hơi nhanh, OmniBot đang xử lý. Quý khách vui lòng đợi một chút rồi hỏi tiếp nhé! ⏳")
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Rate Limiter")
                            .build()
            );
        }

        if (request == null) {
            request = new AiChatRequest();
        }

        return ResponseEntity.ok(aiChatbotService.chat(request));
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "status", "ONLINE",
                "service", "OmniResto AI Culinary Assistant",
                "version", "1.0.0"
        );
    }
}
