package com.omniresto.backend.model.order.request;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentMethod;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class OrderRequest {
    private String branchId;
    private String branchName;
    private OrderType orderType;
    private String tableNo;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String customerName;
    private PaymentMethod paymentMethod;
    private List<OrderItemRequest> items;
}
