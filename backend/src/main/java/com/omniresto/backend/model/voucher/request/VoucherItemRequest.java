package com.omniresto.backend.model.voucher.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherItemRequest {

    @NotBlank(message = "ID món ăn không được để trống")
    private String menuItemId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng món ăn phải lớn hơn hoặc bằng 1")
    private Integer quantity;
}
