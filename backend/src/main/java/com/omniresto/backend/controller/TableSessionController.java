package com.omniresto.backend.controller;

import com.omniresto.backend.model.session.TableSessionCheckInRequest;
import com.omniresto.backend.model.session.TableSessionResponse;
import com.omniresto.backend.service.TableSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/table-sessions")
@RequiredArgsConstructor
public class TableSessionController {

    private final TableSessionService tableSessionService;

    @PostMapping("/check-in")
    public ResponseEntity<TableSessionResponse> checkIn(
            @Valid @RequestBody TableSessionCheckInRequest request
    ) {
        return ResponseEntity.ok(tableSessionService.checkInOrJoin(request.getQrSecretToken(), request.getMode()));
    }

    @GetMapping("/current")
    public ResponseEntity<TableSessionResponse> getCurrentSession(
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken
    ) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(tableSessionService.getSessionByToken(sessionToken));
    }

    @PostMapping("/request-payment")
    public ResponseEntity<TableSessionResponse> requestPayment(
            @RequestHeader(value = "X-Table-Session") String sessionToken
    ) {
        return ResponseEntity.ok(tableSessionService.requestPayment(sessionToken));
    }

    @PostMapping("/cancel-payment-request")
    public ResponseEntity<TableSessionResponse> cancelPaymentRequest(
            @RequestHeader(value = "X-Table-Session") String sessionToken
    ) {
        return ResponseEntity.ok(tableSessionService.cancelPaymentRequest(sessionToken));
    }

    @PostMapping("/verify")
    public ResponseEntity<TableSessionResponse> verifySession(
            @RequestParam String sessionToken,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId
    ) {
        return ResponseEntity.ok(tableSessionService.verifySession(sessionToken, staffId));
    }

    @PostMapping("/confirm-payment")
    public ResponseEntity<TableSessionResponse> confirmPayment(
            @RequestParam String sessionToken,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId,
            @RequestParam(required = false) com.omniresto.backend.domain.enums.PaymentMethod method,
            @RequestParam(required = false) java.math.BigDecimal amountReceived
    ) {
        return ResponseEntity.ok(tableSessionService.confirmPayment(sessionToken, staffId, method, amountReceived));
    }

    @PostMapping("/close")
    public ResponseEntity<Map<String, String>> closeSession(
            @RequestParam String tableId,
            @RequestParam(defaultValue = "MANUAL_CLOSE") String reason
    ) {
        tableSessionService.closeSessionsForTable(tableId, reason);
        return ResponseEntity.ok(Map.of("message", "Đã đóng toàn bộ phiên cho bàn " + tableId));
    }
}
