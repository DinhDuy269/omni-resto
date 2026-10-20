package com.omniresto.backend.model.voucher.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.omniresto.backend.domain.enums.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class VoucherRequest {

    @NotBlank(message = "Mã voucher không được để trống")
    private String code;

    @NotBlank(message = "Tên chương trình khuyến mãi không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Hình thức giảm giá không được để trống")
    @JsonAlias({"discountType", "discount_type"})
    private DiscountType discountType;

    @NotNull(message = "Giá trị giảm giá không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá trị giảm giá phải lớn hơn 0")
    @JsonAlias({"discountValue", "discount_value"})
    private BigDecimal discountValue;

    @JsonAlias({"maxDiscountAmount", "max_discount_amount"})
    private BigDecimal maxDiscountAmount;

    @JsonAlias({"minOrderAmount", "min_order_amount"})
    private BigDecimal minOrderAmount;

    @NotNull(message = "Tổng số lượng phát hành không được để trống")
    @Min(value = 1, message = "Tổng số lượng voucher tối thiểu phải là 1")
    @JsonAlias({"totalQuantity", "total_quantity"})
    private Integer totalQuantity;

    @Min(value = 1, message = "Giới hạn lượt dùng/khách tối thiểu phải là 1")
    @JsonAlias({"usageLimitPerUser", "usage_limit_per_user"})
    private Integer usageLimitPerUser;

    @NotNull(message = "Ngày bắt đầu áp dụng không được để trống")
    @JsonAlias({"startDate", "start_date"})
    private LocalDateTime startDate;

    @NotNull(message = "Ngày kết thúc áp dụng không được để trống")
    @JsonAlias({"endDate", "end_date"})
    private LocalDateTime endDate;

    @JsonAlias({"isWelcomeVoucher", "is_welcome_voucher"})
    private Boolean isWelcomeVoucher;
}