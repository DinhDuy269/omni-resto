package com.omniresto.backend.controller;

import com.omniresto.backend.model.voucher.request.VoucherRequest;
import com.omniresto.backend.model.voucher.response.VoucherResponse;
import com.omniresto.backend.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API không bị lỗi CORS
public class VoucherController {

    private final VoucherService voucherService;

    // API cho Admin: Lấy tất cả voucher
    @GetMapping
    public ResponseEntity<List<VoucherResponse>> getAllVouchers() {
        return ResponseEntity.ok(voucherService.getAllVouchers());
    }

    // API cho Client: Lấy các voucher đang có hiệu lực để hiển thị lên app
    @GetMapping("/available")
    public ResponseEntity<List<VoucherResponse>> getAvailableVouchers() {
        return ResponseEntity.ok(voucherService.getAvailableVouchers());
    }

    // API cho Admin: Tạo mới voucher
    @PostMapping
    public ResponseEntity<VoucherResponse> createVoucher(@RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.createVoucher(request));
    }

    // API cho Client: Lúc người dùng nhập mã ở giỏ hàng, Frontend sẽ gọi API này
    // Ví dụ: GET /api/vouchers/validate?code=GIAM20K&orderAmount=150000
    @GetMapping("/validate")
    public ResponseEntity<VoucherResponse> validateVoucher(
            @RequestParam String code,
            @RequestParam BigDecimal orderAmount) {
        return ResponseEntity.ok(voucherService.validateVoucherForOrder(code, orderAmount));
    }

    // Thêm API cập nhật trạng thái voucher (Kích hoạt / Tạm dừng)
    // Khớp với URL: PATCH /api/vouchers/{id}/status?status=ACTIVE hoặc INACTIVE
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateVoucherStatus(
            @PathVariable String id,
            @RequestParam String status) {
        voucherService.updateVoucherStatus(id, status);
        return ResponseEntity.ok().build();
    }
}