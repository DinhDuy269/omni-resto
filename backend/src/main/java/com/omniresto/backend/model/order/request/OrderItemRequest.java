package com.omniresto.backend.model.order.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class OrderItemRequest {

    @NotBlank(message = "Mã món ăn (menuItemId) không được để trống")
    @Size(max = 36, message = "Mã món ăn không được vượt quá 36 ký tự")
    private String menuItemId;

    private String name;

    @NotNull(message = "Số lượng món không được để trống")
    @Min(value = 1, message = "Số lượng món phải từ 1 trở lên")
    @Max(value = 100, message = "Số lượng món tối đa là 100 cho mỗi dòng")
    private Integer quantity;

    private BigDecimal price;

    @Size(max = 255, message = "Ghi chú món không được vượt quá 255 ký tự")
    private String notes;

    private List<String> optionIds;
}
