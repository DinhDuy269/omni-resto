package com.omniresto.backend.model.voucher.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherPreviewRequest {

    @NotBlank(message = "Mã voucher không được để trống")
    private String code;

    @NotEmpty(message = "Danh sách món ăn không được để trống")
    @Valid
    private List<VoucherItemRequest> items;
}
