package com.omniresto.backend.controller;

import com.omniresto.backend.model.voucher.request.VoucherRequest;
import com.omniresto.backend.model.voucher.response.VoucherResponse;
import com.omniresto.backend.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VoucherController {

    private final VoucherService voucherService;

    /**
     * API Quản trị: Lấy danh sách toàn bộ voucher (có hỗ trợ lọc theo trạng thái)
     */
    @GetMapping
    public ResponseEntity<List<VoucherResponse>> getAllVouchers(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(voucherService.getAllVouchers(status));
    }

    /**
     * API Khách hàng: Lấy các voucher đang có hiệu lực để hiển thị lên app
     */
    @GetMapping("/available")
    public ResponseEntity<List<VoucherResponse>> getAvailableVouchers() {
        return ResponseEntity.ok(voucherService.getAvailableVouchers());
    }

    /**
     * API Lấy chi tiết voucher theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<VoucherResponse> getVoucherById(@PathVariable String id) {
        return ResponseEntity.ok(voucherService.getVoucherById(id));
    }

    /**
     * API Quản trị: Tạo mới voucher
     */
    @PostMapping
    public ResponseEntity<VoucherResponse> createVoucher(@Valid @RequestBody VoucherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(voucherService.createVoucher(request));
    }

    /**
     * API Quản trị: Chỉnh sửa thông tin voucher
     */
    @PutMapping("/{id}")
    public ResponseEntity<VoucherResponse> updateVoucher(
            @PathVariable String id,
            @Valid @RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.updateVoucher(id, request));
    }

    /**
     * API Quản trị: Cập nhật trạng thái voucher (Kích hoạt / Tạm dừng)
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateVoucherStatus(
            @PathVariable String id,
            @RequestParam String status) {
        voucherService.updateVoucherStatus(id, status);
        return ResponseEntity.ok().build();
    }

    /**
     * API Quản trị: Xóa voucher (Soft-delete nếu đã phát sinh lượt dùng)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVoucher(@PathVariable String id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * API Khách hàng: Kiểm tra tính hợp lệ của mã khuyến mãi theo giá trị đơn hàng
     */
    @GetMapping("/validate")
    public ResponseEntity<VoucherResponse> validateVoucher(
            @RequestParam String code,
            @RequestParam BigDecimal orderAmount) {
        return ResponseEntity.ok(voucherService.validateVoucherForOrder(code, orderAmount));
    }
}