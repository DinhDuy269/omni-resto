package com.omniresto.backend.model.order.request;

import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrderRequest {

    @NotNull(message = "Loại đơn hàng (orderType) không được để trống")
    private OrderType orderType;

    private String tableNo;

    @Size(max = 100, message = "Tên khách hàng không được vượt quá 100 ký tự")
    private String customerName;

    private PaymentMethod paymentMethod;

    @NotEmpty(message = "Danh sách món ăn không được để trống")
    @Size(max = 50, message = "Không được đặt quá 50 dòng món trong một đơn")
    private List<@Valid OrderItemRequest> items;
}
