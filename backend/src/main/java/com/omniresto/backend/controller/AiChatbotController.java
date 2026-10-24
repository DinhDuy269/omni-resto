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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestBody(required = false) AiChatRequest request,
            HttpServletRequest servletRequest) {

        // 1. Xác thực phiên bàn hoặc phân định khách xem menu online
        String sessionKey;
        boolean sessionInvalid = false;
        String clientIp = extractClientIp(servletRequest);
        String effectiveClientId = (clientId != null && !clientId.trim().isEmpty()) ? clientId.trim() : "anon";

        if (sessionToken != null && !sessionToken.trim().isEmpty()) {
            try {
                tableSessionService.validateAndTouchSession(sessionToken.trim());
                sessionKey = "table:" + sessionToken.trim();
            } catch (Exception e) {
                log.info("Session token '{}' invalid or expired ({}), falling back to guest mode", sessionToken, e.getMessage());
                sessionInvalid = true;
                sessionKey = "guest:" + clientIp + ":" + effectiveClientId;
            }
        } else {
            // Khách duyệt thực đơn trực tuyến: kết hợp IP + ClientId để tránh chặn nhầm khi dùng chung wifi quán
            sessionKey = "guest:" + clientIp + ":" + effectiveClientId;
        }

        // 2. Giới hạn lượt gửi (Rate Limiting)
        if (!rateLimiter.tryAcquire(sessionKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                    AiChatResponse.builder()
                            .reply("Dạ quý khách gửi tin nhắn hơi nhanh hoặc hệ thống đang xử lý nhiều lượt yêu cầu. Quý khách vui lòng đợi một chút rồi hỏi tiếp nhé!")
                            .recommendedDishes(Collections.emptyList())
                            .modelUsed("Rate Limiter")
                            .build()
            );
        }

        if (request == null) {
            request = new AiChatRequest();
        }

        var responseBuilder = ResponseEntity.ok();
        if (sessionInvalid) {
            responseBuilder.header("X-Table-Session-Status", "INVALID");
        }
        return responseBuilder.body(aiChatbotService.chat(request));
    }

    @PostMapping(value = "/stream-chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestBody(required = false) AiChatRequest request,
            HttpServletRequest servletRequest) {

        SseEmitter emitter = new SseEmitter(60_000L);

        // 1. Xác thực phiên bàn hoặc phân định khách xem menu online
        String sessionKey;
        String clientIp = extractClientIp(servletRequest);
        String effectiveClientId = (clientId != null && !clientId.trim().isEmpty()) ? clientId.trim() : "anon";

        if (sessionToken != null && !sessionToken.trim().isEmpty()) {
            try {
                tableSessionService.validateAndTouchSession(sessionToken.trim());
                sessionKey = "table:" + sessionToken.trim();
            } catch (Exception e) {
                log.info("Session token '{}' invalid or expired ({}), falling back to guest mode", sessionToken, e.getMessage());
                sessionKey = "guest:" + clientIp + ":" + effectiveClientId;
            }
        } else {
            sessionKey = "guest:" + clientIp + ":" + effectiveClientId;
        }

        // 2. Giới hạn lượt gửi (Rate Limiting)
        if (!rateLimiter.tryAcquire(sessionKey)) {
            try {
                emitter.send(SseEmitter.event().name("error").data(Map.of(
                        "reply", "Dạ quý khách gửi tin nhắn hơi nhanh hoặc hệ thống đang xử lý nhiều lượt yêu cầu. Quý khách vui lòng đợi một chút rồi hỏi tiếp nhé!"
                )));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        if (request == null) {
            request = new AiChatRequest();
        }

        aiChatbotService.streamChat(request, emitter);
        return emitter;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "guest";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            String[] parts = xForwardedFor.split(",");
            if (parts.length > 0 && !parts[0].trim().isEmpty()) {
                return parts[0].trim();
            }
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.trim().isEmpty()) {
            return xRealIp.trim();
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.trim().isEmpty()) ? remoteAddr.trim() : "guest";
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "status", "ONLINE",
                "service", "OmniResto AI Culinary Assistant",
                "version", "1.1.0",
                "maxPerMinute", rateLimiter.getMaxRequestsPerMinute(),
                "globalMaxPerMinute", rateLimiter.getGlobalMaxRequestsPerMinute()
        );
    }
}
