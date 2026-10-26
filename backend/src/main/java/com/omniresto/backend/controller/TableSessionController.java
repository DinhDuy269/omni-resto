package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.PaymentMethod;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.model.session.TableSessionCheckInRequest;
import com.omniresto.backend.model.session.TableSessionResponse;
import com.omniresto.backend.service.TableSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/table-sessions")
@RequiredArgsConstructor
public class TableSessionController {

    private final TableSessionService tableSessionService;

    @Value("${omniresto.security.staff-key:STAFF_SECRET_KEY}")
    private String configuredStaffKey;

    private void checkStaffAccess(String staffKey) {
        if (staffKey == null || staffKey.isBlank() || !staffKey.trim().equals(configuredStaffKey.trim())) {
            throw new AccessDeniedException("Truy cập bị từ chối: Thao tác này chỉ dành cho nhân viên có thẩm quyền!");
        }
    }

    @PostMapping("/check-in")
    public TableSessionResponse checkIn(
            @Valid @RequestBody TableSessionCheckInRequest request
    ) {
        return tableSessionService.checkInOrJoin(request.getQrSecretToken(), request.getDeviceToken(), request.getMode());
    }

    @GetMapping("/current")
    public TableSessionResponse getCurrentSession(
            @RequestHeader(value = "X-Table-Session", required = false) String sessionToken
    ) {
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new BadRequestException("Header X-Table-Session không được để trống");
        }
        return tableSessionService.getSessionByToken(sessionToken);
    }

    @PostMapping("/request-payment")
    public TableSessionResponse requestPayment(
            @RequestHeader(value = "X-Table-Session") String sessionToken
    ) {
        return tableSessionService.requestPayment(sessionToken);
    }

    @PostMapping("/cancel-payment-request")
    public TableSessionResponse cancelPaymentRequest(
            @RequestHeader(value = "X-Table-Session") String sessionToken
    ) {
        return tableSessionService.cancelPaymentRequest(sessionToken);
    }

    @PostMapping("/verify")
    public TableSessionResponse verifySession(
            @RequestParam String sessionToken,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        return tableSessionService.verifySession(sessionToken, staffId);
    }

    @PostMapping("/confirm-payment")
    public TableSessionResponse confirmPayment(
            @RequestParam String sessionToken,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) BigDecimal amountReceived,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        // Bảo vệ nghiêm ngặt: Tuyệt đối không cho phép khách hàng tự xác nhận thanh toán
        checkStaffAccess(staffKey);
        return tableSessionService.confirmPayment(sessionToken, staffId, PaymentMethod.fromString(method), amountReceived);
    }

    @PostMapping("/tables/{tableId}/confirm-payment")
    public TableSessionResponse confirmPaymentForTable(
            @PathVariable String tableId,
            @RequestParam(required = false, defaultValue = "STAFF-POS") String staffId,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) BigDecimal amountReceived,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        return tableSessionService.confirmPaymentByTable(tableId, staffId, PaymentMethod.fromString(method), amountReceived);
    }

    @PostMapping("/close")
    public Map<String, String> closeSession(
            @RequestParam String tableId,
            @RequestParam(defaultValue = "MANUAL_CLOSE") String reason,
            @RequestHeader(value = "X-Staff-Key", required = false) String staffKey
    ) {
        checkStaffAccess(staffKey);
        tableSessionService.closeSessionsForTable(tableId, reason);
        return Map.of("message", "Đã đóng toàn bộ phiên cho bàn " + tableId);
    }
}
