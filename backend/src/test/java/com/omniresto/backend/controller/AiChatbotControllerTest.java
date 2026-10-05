package com.omniresto.backend.controller;

import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.dto.ai.AiChatRequest;
import com.omniresto.backend.dto.ai.AiChatResponse;
import com.omniresto.backend.service.AiChatRateLimiter;
import com.omniresto.backend.service.AiChatbotService;
import com.omniresto.backend.service.TableSessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatbotControllerTest {

    @Mock
    private AiChatbotService aiChatbotService;

    @Mock
    private TableSessionService tableSessionService;

    @Mock
    private AiChatRateLimiter rateLimiter;

    @Mock
    private HttpServletRequest servletRequest;

    @InjectMocks
    private AiChatbotController aiChatbotController;

    @Test
    @DisplayName("Khách xem menu online không có token bàn vẫn được tư vấn (rate limit theo IP)")
    void testGuestWithoutSessionTokenAllowed() {
        when(servletRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(rateLimiter.tryAcquire("guest:127.0.0.1")).thenReturn(true);
        when(aiChatbotService.chat(any())).thenReturn(
                AiChatResponse.builder()
                        .reply("Dạ em chào quý khách!")
                        .recommendedDishes(Collections.emptyList())
                        .build()
        );

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Xin chào");

        ResponseEntity<AiChatResponse> response = aiChatbotController.chat(null, request, servletRequest);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Dạ em chào quý khách!", response.getBody().getReply());

        verify(aiChatbotService, times(1)).chat(any());
    }

    @Test
    @DisplayName("Session token không hợp lệ hoặc hết hạn: tự động fallback sang guest mode và trả về 200 OK")
    void testInvalidSessionTokenFallsBackToGuestMode() {
        when(tableSessionService.validateAndTouchSession("invalid_token"))
                .thenThrow(new RuntimeException("Session not found or closed"));
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiter.tryAcquire("guest:192.168.1.50")).thenReturn(true);
        when(aiChatbotService.chat(any())).thenReturn(
                AiChatResponse.builder()
                        .reply("Dạ em chào quý khách!")
                        .recommendedDishes(Collections.emptyList())
                        .build()
        );

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Xin chào");

        ResponseEntity<AiChatResponse> response = aiChatbotController.chat("invalid_token", request, servletRequest);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Dạ em chào quý khách!", response.getBody().getReply());
        assertEquals("INVALID", response.getHeaders().getFirst("X-Table-Session-Status"));

        verify(aiChatbotService, times(1)).chat(any());
    }

    @Test
    @DisplayName("P1: Vượt quá giới hạn lượt hỏi (Rate Limit) phải trả về 429 Too Many Requests")
    void testRateLimitExceededReturns429() {
        when(tableSessionService.validateAndTouchSession("valid_token"))
                .thenReturn(new TableSessionEntity());
        when(rateLimiter.tryAcquire("table:valid_token")).thenReturn(false);

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Xin chào");

        ResponseEntity<AiChatResponse> response = aiChatbotController.chat("valid_token", request, servletRequest);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getReply().contains("nhanh"));

        verify(aiChatbotService, never()).chat(any());
    }

    @Test
    @DisplayName("Thành công: Có session token hợp lệ và trong giới hạn rate limit trả về 200 OK")
    void testValidSessionTokenSuccess() {
        when(tableSessionService.validateAndTouchSession("valid_token"))
                .thenReturn(new TableSessionEntity());
        when(rateLimiter.tryAcquire("table:valid_token")).thenReturn(true);
        when(aiChatbotService.chat(any())).thenReturn(
                AiChatResponse.builder()
                        .reply("Dạ em chào anh chị!")
                        .recommendedDishes(Collections.emptyList())
                        .build()
        );

        AiChatRequest request = new AiChatRequest();
        request.setMessage("Xin chào");

        ResponseEntity<AiChatResponse> response = aiChatbotController.chat("valid_token", request, servletRequest);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Dạ em chào anh chị!", response.getBody().getReply());

        verify(aiChatbotService, times(1)).chat(any());
    }
}
