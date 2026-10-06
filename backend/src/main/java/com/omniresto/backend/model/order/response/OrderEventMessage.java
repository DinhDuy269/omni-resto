package com.omniresto.backend.model.order.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEventMessage {
    private String eventType; // "ORDER_CREATED", "ORDER_STATUS_CHANGED"
    private OrderResponse order;
}
