package com.omniresto.backend.service;

import com.omniresto.backend.domain.VoucherEntity;
import com.omniresto.backend.domain.enums.DiscountType;
import com.omniresto.backend.domain.enums.VoucherStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.voucher.request.VoucherRequest;
import com.omniresto.backend.model.voucher.response.VoucherResponse;
import com.omniresto.backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    @Transactional(readOnly = true)
    public List<VoucherResponse> getAllVouchers(String status) {
        List<VoucherEntity> entities;
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status.trim())) {
            try {
                VoucherStatus targetStatus = VoucherStatus.valueOf(status.trim().toUpperCase());
                entities = voucherRepository.findAll().stream()
                        .filter(v -> v.getStatus() == targetStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                entities = voucherRepository.findAll();
            }
        } else {
            entities = voucherRepository.findAll();
        }

        return entities.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> getAvailableVouchers() {
        return voucherRepository.findAvailableVouchers(LocalDateTime.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VoucherResponse getVoucherById(String id) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với mã ID: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public VoucherResponse createVoucher(VoucherRequest request) {
        String cleanCode = request.getCode().trim().toUpperCase();

        if (voucherRepository.findByCodeIgnoreCase(cleanCode).isPresent()) {
            throw new BadRequestException("Mã Voucher đã tồn tại: " + cleanCode);
        }

        if (request.getEndDate() != null && request.getStartDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải diễn ra sau ngày bắt đầu khuyến mãi.");
        }

        if (request.getDiscountType() == DiscountType.percentage || request.getDiscountType() == DiscountType.PERCENTAGE) {
            if (request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Phần trăm giảm giá không thể vượt quá 100%.");
            }
        }

        VoucherEntity entity = VoucherEntity.builder()
                .code(cleanCode)
                .name(request.getName().trim())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .minOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO)
                .totalQuantity(request.getTotalQuantity())
                .usedQuantity(0)
                .usageLimitPerUser(request.getUsageLimitPerUser() != null ? request.getUsageLimitPerUser() : 1)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isWelcomeVoucher(Boolean.TRUE.equals(request.getIsWelcomeVoucher()))
                .status(VoucherStatus.ACTIVE)
                .build();

        entity.setId("vch-" + UUID.randomUUID().toString().substring(0, 8));

        VoucherEntity saved = voucherRepository.save(entity);
        log.info("Đã tạo mới voucher thành công: [ID: {}, Code: {}]", saved.getId(), saved.getCode());
        return mapToResponse(saved);
    }

    @Transactional
    public VoucherResponse updateVoucher(String id, VoucherRequest request) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với mã ID: " + id));

        String cleanCode = request.getCode().trim().toUpperCase();
        // Kiểm tra nếu đổi mã sang một mã khác đã tồn tại
        if (!entity.getCode().equalsIgnoreCase(cleanCode)) {
            if (voucherRepository.findByCodeIgnoreCase(cleanCode).isPresent()) {
                throw new BadRequestException("Mã Voucher đã tồn tại ở chương trình khác: " + cleanCode);
            }
            entity.setCode(cleanCode);
        }

        if (request.getEndDate() != null && request.getStartDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải diễn ra sau ngày bắt đầu khuyến mãi.");
        }

        if (request.getDiscountType() == DiscountType.percentage || request.getDiscountType() == DiscountType.PERCENTAGE) {
            if (request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Phần trăm giảm giá không thể vượt quá 100%.");
            }
        }

        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription());
        entity.setDiscountType(request.getDiscountType());
        entity.setDiscountValue(request.getDiscountValue());
        entity.setMaxDiscountAmount(request.getMaxDiscountAmount());
        entity.setMinOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO);
        entity.setTotalQuantity(request.getTotalQuantity());
        if (request.getUsageLimitPerUser() != null) {
            entity.setUsageLimitPerUser(request.getUsageLimitPerUser());
        }
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        if (request.getIsWelcomeVoucher() != null) {
            entity.setIsWelcomeVoucher(request.getIsWelcomeVoucher());
        }

        VoucherEntity updated = voucherRepository.save(entity);
        log.info("Đã cập nhật thông tin voucher: [ID: {}, Code: {}]", updated.getId(), updated.getCode());
        return mapToResponse(updated);
    }

    @Transactional
    public void updateVoucherStatus(String id, String status) {
        VoucherEntity voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        try {
            VoucherStatus newStatus = VoucherStatus.valueOf(status.trim().toUpperCase());
            voucher.setStatus(newStatus);
            voucherRepository.save(voucher);
            log.info("Đã đổi trạng thái voucher [ID: {}] sang {}", id, newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái voucher không hợp lệ: " + status);
        }
    }

    @Transactional
    public void deleteVoucher(String id) {
        VoucherEntity voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        // Nếu voucher đã phát sinh lượt dùng -> không hard delete để bảo vệ tính toàn vẹn dữ liệu kế toán
        if (voucher.getUsedQuantity() != null && voucher.getUsedQuantity() > 0) {
            voucher.setStatus(VoucherStatus.INACTIVE);
            voucherRepository.save(voucher);
            log.info("Voucher [ID: {}] đã có {} lượt dùng -> chuyển sang trạng thái INACTIVE", id, voucher.getUsedQuantity());
        } else {
            voucherRepository.delete(voucher);
            log.info("Đã xóa hoàn toàn voucher chưa sử dụng [ID: {}]", id);
        }
    }

    // API xác thực voucher cho Client
    @Transactional(readOnly = true)
    public VoucherResponse validateVoucherForOrder(String code, BigDecimal orderTotal) {
        if (code == null || code.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập mã khuyến mãi.");
        }

        String cleanCode = code.trim().toUpperCase();
        VoucherEntity voucher = voucherRepository.findByCodeIgnoreCase(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Mã Voucher không tồn tại!"));

        // 1. Kiểm tra trạng thái
        if (voucher.getStatus() != VoucherStatus.ACTIVE) {
            throw new BadRequestException("Mã Voucher đã bị khóa hoặc tạm dừng áp dụng.");
        }

        // 2. Kiểm tra thời gian hiệu lực
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(voucher.getStartDate())) {
            throw new BadRequestException("Chương trình khuyến mãi chưa đến ngày bắt đầu áp dụng.");
        }
        if (now.isAfter(voucher.getEndDate())) {
            throw new BadRequestException("Mã Voucher đã hết hạn sử dụng.");
        }

        // 3. Kiểm tra số lượng lượt dùng
        if (voucher.getUsedQuantity() >= voucher.getTotalQuantity()) {
            throw new BadRequestException("Mã Voucher đã hết lượt sử dụng.");
        }

        // 4. Kiểm tra giá trị đơn hàng tối thiểu
        BigDecimal minOrder = voucher.getMinOrderAmount() != null ? voucher.getMinOrderAmount() : BigDecimal.ZERO;
        if (orderTotal == null || orderTotal.compareTo(minOrder) < 0) {
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " +
                    minOrder.toBigInteger() + "đ để áp dụng mã này.");
        }

        return mapToResponse(voucher);
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