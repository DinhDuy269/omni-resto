package com.omniresto.backend.model.order.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentMethod;
import com.omniresto.backend.domain.enums.PaymentStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@JsonRootName("order")
public class OrderResponse {
    private String id;
    private String orderNumber;
    private String tableSessionId;
    private OrderType orderType;
    private String tableNo;
    private OrderStatus status;
    private PaymentStatus paymentStatus;
    private BigDecimal totalAmount;
    private String customerName;
    private PaymentMethod paymentMethod;
    private List<OrderItemResponse> items;
    private LocalDateTime createdAt;
}
