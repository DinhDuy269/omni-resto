package com.omniresto.backend.service;

import com.omniresto.backend.domain.VoucherEntity;
import com.omniresto.backend.domain.enums.VoucherStatus;
import com.omniresto.backend.model.voucher.request.VoucherRequest;
import com.omniresto.backend.model.voucher.response.VoucherResponse;
import com.omniresto.backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    public List<VoucherResponse> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<VoucherResponse> getAvailableVouchers() {
        return voucherRepository.findAvailableVouchers(LocalDateTime.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public VoucherResponse createVoucher(VoucherRequest request) {
        if (voucherRepository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Mã Voucher đã tồn tại: " + request.getCode());
        }

        VoucherEntity entity = VoucherEntity.builder()
                .code(request.getCode().toUpperCase())
                .name(request.getName())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .minOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO)
                .totalQuantity(request.getTotalQuantity())
                .usageLimitPerUser(request.getUsageLimitPerUser() != null ? request.getUsageLimitPerUser() : 1)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isWelcomeVoucher(request.getIsWelcomeVoucher() != null ? request.getIsWelcomeVoucher() : false)
                .status(VoucherStatus.ACTIVE)
                .build();
                
        entity.setId("vch-" + UUID.randomUUID().toString().substring(0, 8));

        VoucherEntity saved = voucherRepository.save(entity);
        return mapToResponse(saved);
    }

    public VoucherResponse validateVoucherForOrder(String code, BigDecimal orderTotal) {
        VoucherEntity voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã Voucher không tồn tại!"));

        if (voucher.getStatus() != VoucherStatus.ACTIVE) {
            throw new RuntimeException("Mã Voucher đã bị khóa hoặc không còn hoạt động.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(voucher.getStartDate()) || now.isAfter(voucher.getEndDate())) {
            throw new RuntimeException("Mã Voucher chưa đến thời gian áp dụng hoặc đã hết hạn.");
        }
        if (voucher.getUsedQuantity() >= voucher.getTotalQuantity()) {
            throw new RuntimeException("Mã Voucher đã hết lượt sử dụng.");
        }
        if (orderTotal.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderAmount() + " để áp dụng mã này.");
        }

        return mapToResponse(voucher);
    }

    // Đã sửa: bỏ @Override, dùng VoucherEntity và parse sang VoucherStatus
    public void updateVoucherStatus(String id, String status) {
        VoucherEntity voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với id: " + id));

        voucher.setStatus(VoucherStatus.valueOf(status.toUpperCase()));
        voucherRepository.save(voucher);
    }

    private VoucherResponse mapToResponse(VoucherEntity entity) {
        VoucherResponse res = new VoucherResponse();
        res.setId(entity.getId());
        res.setCode(entity.getCode());
        res.setName(entity.getName());
        res.setDescription(entity.getDescription());
        res.setDiscountType(entity.getDiscountType());
        res.setDiscountValue(entity.getDiscountValue());
        res.setMaxDiscountAmount(entity.getMaxDiscountAmount());
        res.setMinOrderAmount(entity.getMinOrderAmount());
        res.setTotalQuantity(entity.getTotalQuantity());
        res.setUsedQuantity(entity.getUsedQuantity());
        res.setUsageLimitPerUser(entity.getUsageLimitPerUser());
        res.setStartDate(entity.getStartDate());
        res.setEndDate(entity.getEndDate());
        res.setStatus(entity.getStatus());
        res.setIsWelcomeVoucher(entity.getIsWelcomeVoucher());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}