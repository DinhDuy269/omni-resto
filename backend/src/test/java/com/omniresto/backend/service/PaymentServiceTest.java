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
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private OrderService orderService;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    @DisplayName("Should generate valid VietQR response with correctly formatted image URL")
    void generateVietQR_Success() {
        // Arrange
        OrderResponse mockOrder = new OrderResponse();
        mockOrder.setId("ord-100");
        mockOrder.setOrderNumber("ORD-8888");
        mockOrder.setTotalAmount(BigDecimal.valueOf(250000));

        when(orderService.getOrderById("ord-100")).thenReturn(mockOrder);

        // Act
        PaymentService.VietQRResponse qrResponse = paymentService.generateVietQR("ord-100");

        // Assert
        assertNotNull(qrResponse);
        assertEquals("ord-100", qrResponse.getOrderId());
        assertEquals("ORD-8888", qrResponse.getOrderNumber());
        assertEquals(BigDecimal.valueOf(250000), qrResponse.getAmount());
        assertTrue(qrResponse.getQrImageUrl().contains("https://img.vietqr.io/image/MB-0368295264-compact2.png"));
    }

    @Test
    @DisplayName("Should process payment webhook and set order status to preparing")
    void handlePaymentWebhook_Success() {
        // Arrange
        OrderResponse mockOrder = new OrderResponse();
        mockOrder.setId("ord-100");
        mockOrder.setOrderNumber("ORD-8888");
        mockOrder.setTotalAmount(BigDecimal.valueOf(250000));
        mockOrder.setStatus(OrderStatus.pending);

        OrderResponse mockPreparing = new OrderResponse();
        mockPreparing.setId("ord-100");
        mockPreparing.setStatus(OrderStatus.preparing);

        when(paymentTransactionRepository.findByTransactionReference("TXN-9999")).thenReturn(Optional.empty());
        when(orderService.getOrderById("ord-100")).thenReturn(mockOrder);
        when(orderService.updateOrderStatus("ord-100", OrderStatus.preparing)).thenReturn(mockPreparing);

        // Act
        OrderResponse response = paymentService.handlePaymentWebhook("ord-100", "TXN-9999", 250000.0);

        // Assert
        assertNotNull(response);
        assertEquals(OrderStatus.preparing, response.getStatus());
        verify(orderService, times(1)).updateOrderStatus("ord-100", OrderStatus.preparing);
        verify(paymentTransactionRepository, times(1)).save(any());
    }
}
