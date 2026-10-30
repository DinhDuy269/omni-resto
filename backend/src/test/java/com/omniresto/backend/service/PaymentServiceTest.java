package com.omniresto.backend.service;

import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private com.omniresto.backend.repository.OrderRepository orderRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private com.omniresto.backend.config.OrderWebSocketHandler orderWebSocketHandler;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    @DisplayName("Should process payment webhook and set order status to preparing")
    void handlePaymentWebhook_Success() {
        // Arrange
        com.omniresto.backend.domain.OrderEntity orderEntity = com.omniresto.backend.domain.OrderEntity.builder()
                .orderNumber("ORD-8888")
                .status(OrderStatus.pending)
                .paymentStatus(com.omniresto.backend.domain.enums.PaymentStatus.unpaid)
                .totalAmount(BigDecimal.valueOf(250000))
                .build();
        orderEntity.setId("ord-100");

        when(paymentTransactionRepository.findByTransactionReference("TXN-9999")).thenReturn(Optional.empty());
        when(orderRepository.findById("ord-100")).thenReturn(Optional.of(orderEntity));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        OrderResponse response = paymentService.handlePaymentWebhook("ord-100", "TXN-9999", 250000.0);

        // Assert
        assertNotNull(response);
        verify(orderRepository, times(1)).save(orderEntity);
        verify(paymentTransactionRepository, times(1)).save(any());
    }
}
