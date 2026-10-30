package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.VoucherEntity;
import com.omniresto.backend.domain.enums.DiscountType;
import com.omniresto.backend.domain.enums.MenuStatus;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.RedemptionStatus;
import com.omniresto.backend.domain.enums.VoucherStatus;
import com.omniresto.backend.domain.enums.VoucherType;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.voucher.request.VoucherItemRequest;
import com.omniresto.backend.model.voucher.request.VoucherPreviewRequest;
import com.omniresto.backend.model.voucher.request.VoucherRequest;
import com.omniresto.backend.model.voucher.response.VoucherPreviewResponse;
import com.omniresto.backend.model.voucher.response.VoucherResponse;
import com.omniresto.backend.repository.CustomerRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import com.omniresto.backend.repository.VoucherRedemptionRepository;
import com.omniresto.backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final VoucherRedemptionRepository voucherRedemptionRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ActionLogService actionLogService;

    @Transactional(readOnly = true)
    public List<VoucherResponse> getAllVouchers(String status) {
        List<VoucherEntity> entities;
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status.trim())) {
            try {
                VoucherStatus targetStatus = VoucherStatus.fromString(status.trim());
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

        if (request.getDiscountType() == DiscountType.percentage) {
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
                .voucherType(Boolean.TRUE.equals(request.getIsWelcomeVoucher()) ? VoucherType.welcome : VoucherType.general)
                .status(VoucherStatus.active)
                .build();

        entity.setId("vch-" + UUID.randomUUID().toString().substring(0, 8));

        VoucherEntity saved = voucherRepository.save(entity);
        log.info("Đã tạo mới voucher thành công: [ID: {}, Code: {}]", saved.getId(), saved.getCode());
        actionLogService.record("Khuyến Mãi & Voucher", "Tạo voucher", "Tạo voucher: " + saved.getCode() + " (" + saved.getName() + ")");
        return mapToResponse(saved);
    }

    @Transactional
    public VoucherResponse updateVoucher(String id, VoucherRequest request) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với mã ID: " + id));

        String cleanCode = request.getCode().trim().toUpperCase();
        if (!entity.getCode().equalsIgnoreCase(cleanCode)) {
            if (voucherRepository.findByCodeIgnoreCase(cleanCode).isPresent()) {
                throw new BadRequestException("Mã Voucher đã tồn tại ở chương trình khác: " + cleanCode);
            }
            entity.setCode(cleanCode);
        }

        if (request.getEndDate() != null && request.getStartDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải diễn ra sau ngày bắt đầu khuyến mãi.");
        }

        if (request.getDiscountType() == DiscountType.percentage) {
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
            if (Boolean.TRUE.equals(request.getIsWelcomeVoucher())) {
                entity.setVoucherType(VoucherType.welcome);
            }
        }

        VoucherEntity updated = voucherRepository.save(entity);
        log.info("Đã cập nhật thông tin voucher: [ID: {}, Code: {}]", updated.getId(), updated.getCode());
        actionLogService.record("Khuyến Mãi & Voucher", "Cập nhật voucher", "Cập nhật voucher: " + updated.getCode());
        return mapToResponse(updated);
    }

    @Transactional
    public void updateVoucherStatus(String id, String status) {
        VoucherEntity voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        try {
            VoucherStatus newStatus = VoucherStatus.fromString(status.trim());
            voucher.setStatus(newStatus);
            voucherRepository.save(voucher);
            log.info("Đã đổi trạng thái voucher [ID: {}] sang {}", id, newStatus);
            actionLogService.record("Khuyến Mãi & Voucher", "Đổi trạng thái voucher", "Đổi trạng thái voucher " + voucher.getCode() + " sang " + newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái voucher không hợp lệ: " + status);
        }
    }

    @Transactional
    public void deleteVoucher(String id) {
        VoucherEntity voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));

        if (voucher.getUsedQuantity() != null && voucher.getUsedQuantity() > 0) {
            voucher.setStatus(VoucherStatus.inactive);
            voucherRepository.save(voucher);
            log.info("Voucher [ID: {}] đã có {} lượt dùng -> chuyển sang trạng thái INACTIVE", id, voucher.getUsedQuantity());
            actionLogService.record("Khuyến Mãi & Voucher", "Đổi trạng thái voucher", "Chuyển voucher " + voucher.getCode() + " sang không hoạt động");
        } else {
            voucherRepository.delete(voucher);
            log.info("Đã xóa hoàn toàn voucher chưa sử dụng [ID: {}]", id);
            actionLogService.record("Khuyến Mãi & Voucher", "Xóa voucher", "Xóa voucher: " + voucher.getCode());
        }
    }

    /**
     * Tầng 1: Preview Voucher (Kiểm tra điều kiện & tính toán trước cho giỏ hàng của Client)
     * Toàn bộ giá trị subtotal được server tự tính từ database (Server-authoritative pricing).
     */
    @Transactional(readOnly = true)
    public VoucherPreviewResponse previewVoucher(VoucherPreviewRequest request, String customerId) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Giỏ hàng của bạn đang trống!");
        }

        // Tính subtotal chuẩn mực từ database để chống giả mạo giá tiền
        Set<String> itemIds = request.getItems().stream()
                .map(VoucherItemRequest::getMenuItemId)
                .collect(Collectors.toSet());

        Map<String, MenuItemEntity> itemMap = menuItemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(MenuItemEntity::getId, Function.identity()));

        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        for (VoucherItemRequest reqItem : request.getItems()) {
            MenuItemEntity dbItem = itemMap.get(reqItem.getMenuItemId());
            if (dbItem == null) {
                throw new BadRequestException("Món ăn không tồn tại trong thực đơn: " + reqItem.getMenuItemId());
            }
            if (dbItem.getStatus() != MenuStatus.available) {
                throw new BadRequestException("Món '" + dbItem.getName() + "' hiện đã tạm ngưng phục vụ.");
            }
            BigDecimal itemTotal = dbItem.getPrice().multiply(BigDecimal.valueOf(reqItem.getQuantity()));
            calculatedSubtotal = calculatedSubtotal.add(itemTotal);
        }

        VoucherEntity voucher = validateAndGetVoucher(request.getCode(), customerId, calculatedSubtotal);
        BigDecimal discount = calculateDiscount(voucher, calculatedSubtotal);
        BigDecimal finalAmount = calculatedSubtotal.subtract(discount).max(BigDecimal.ZERO);

        return VoucherPreviewResponse.builder()
                .code(voucher.getCode())
                .voucherName(voucher.getName())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .subtotal(calculatedSubtotal)
                .discountAmount(discount)
                .finalAmount(finalAmount)
                .message("Áp dụng mã giảm giá thành công!")
                .build();
    }

    /**
     * Pipeline thẩm định tính hợp lệ của Voucher (Multi-stage Validation Pipeline)
     */
    @Transactional(readOnly = true)
    public VoucherEntity validateAndGetVoucher(String code, String customerId, BigDecimal orderAmount) {
        if (code == null || code.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập mã khuyến mãi.");
        }

        String cleanCode = code.trim().toUpperCase();
        VoucherEntity voucher = voucherRepository.findByCodeIgnoreCase(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi không tồn tại: " + cleanCode));

        // 1. Kiểm tra trạng thái hoạt động
        if (voucher.getStatus() != VoucherStatus.active) {
            throw new BadRequestException("Mã khuyến mãi đã bị khóa hoặc tạm dừng áp dụng.");
        }

        // 2. Kiểm tra thời hạn hiệu lực
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(voucher.getStartDate())) {
            throw new BadRequestException("Chương trình khuyến mãi chưa đến ngày bắt đầu.");
        }
        if (now.isAfter(voucher.getEndDate())) {
            throw new BadRequestException("Mã khuyến mãi đã hết hạn sử dụng.");
        }

        // 3. Kiểm tra số lượng lượt dùng toàn hệ thống
        if (voucher.getUsedQuantity() >= voucher.getTotalQuantity()) {
            throw new BadRequestException("Mã khuyến mãi đã hết lượt sử dụng trên hệ thống.");
        }

        // 4. Kiểm tra giá trị đơn hàng tối thiểu
        BigDecimal minOrder = voucher.getMinOrderAmount() != null ? voucher.getMinOrderAmount() : BigDecimal.ZERO;
        if (orderAmount == null || orderAmount.compareTo(minOrder) < 0) {
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " +
                    minOrder.toBigInteger() + "đ để áp dụng voucher này.");
        }

        // 5. Kiểm tra giới hạn lượt dùng của từng thành viên qua bảng sổ cái voucher_redemptions
        long userUsedCount = voucherRedemptionRepository.countByVoucherIdAndCustomerIdAndStatus(
                voucher.getId(),
                customerId,
                RedemptionStatus.applied
        );
        int limitPerUser = voucher.getUsageLimitPerUser() != null ? voucher.getUsageLimitPerUser() : 1;
        if (userUsedCount >= limitPerUser) {
            throw new BadRequestException("Bạn đã dùng hết số lượt cho phép (" + limitPerUser + " lượt) của mã khuyến mãi này.");
        }

        // 6. Kiểm tra các điều kiện đặc thù theo loại voucher
        if (voucher.getVoucherType() == VoucherType.welcome || Boolean.TRUE.equals(voucher.getIsWelcomeVoucher())) {
            long existingOrders = orderRepository.countByCustomerIdAndStatusNot(customerId, OrderStatus.cancelled);
            if (existingOrders > 0) {
                throw new BadRequestException("Voucher chào mừng chỉ áp dụng cho đơn hàng đầu tiên của thành viên mới.");
            }
        } else if (voucher.getVoucherType() == VoucherType.birthday) {
            CustomerEntity customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản thành viên!"));
            if (customer.getDateOfBirth() == null) {
                throw new BadRequestException("Vui lòng cập nhật ngày sinh trong hồ sơ để áp dụng voucher sinh nhật.");
            }
            if (customer.getDateOfBirth().getMonth() != LocalDate.now().getMonth()) {
                throw new BadRequestException("Voucher sinh nhật chỉ áp dụng trong tháng sinh nhật của bạn (Tháng " +
                        customer.getDateOfBirth().getMonthValue() + ").");
            }
        }

        return voucher;
    }

    /**
     * Tính toán giá trị giảm giá chính xác với làm tròn và chặn trần maxDiscountAmount
     */
    public BigDecimal calculateDiscount(VoucherEntity voucher, BigDecimal subtotal) {
        if (voucher == null || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal discount;
        if (voucher.getDiscountType() == DiscountType.percentage) {
            discount = subtotal.multiply(voucher.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discount = voucher.getMaxDiscountAmount();
            }
        } else {
            discount = voucher.getDiscountValue();
        }

        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }
        return discount;
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