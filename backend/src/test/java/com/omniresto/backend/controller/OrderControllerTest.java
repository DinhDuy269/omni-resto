package com.omniresto.backend.controller;

import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.PaymentStatus;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.TableSessionRepository;
import com.omniresto.backend.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private TableSessionRepository tableSessionRepository;

    @InjectMocks
    private OrderController orderController;

    private static final String CONFIGURED_STAFF_KEY = "STAFF_SECRET_KEY";

    private OrderResponse mockOrder;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(orderController, "configuredStaffKey", CONFIGURED_STAFF_KEY);

        mockOrder = new OrderResponse();
        mockOrder.setId("ord-123");
        mockOrder.setOrderNumber("ORD-12345");
        mockOrder.setTableSessionId("sess-primary-id");
        mockOrder.setTableNo("Bàn 01");
        mockOrder.setOrderType(OrderType.dine_in);
        mockOrder.setStatus(OrderStatus.pending);
        mockOrder.setPaymentStatus(PaymentStatus.unpaid);
        mockOrder.setTotalAmount(BigDecimal.valueOf(150000));
    }

    @Test
    @DisplayName("Staff with valid X-Staff-Key can access any order")
    void getOrderById_WithValidStaffKey_Success() {
        when(orderService.getOrderById("ord-123")).thenReturn(mockOrder);

        OrderResponse result = orderController.getOrderById("ord-123", null, CONFIGURED_STAFF_KEY);

        assertNotNull(result);
        assertEquals("ord-123", result.getId());
        verify(orderService).getOrderById("ord-123");
    }

    @Test
    @DisplayName("Dine-in customer with sessionToken resolving to order's tableSessionId can view order")
    void getOrderById_WithMatchingSessionToken_Success() {
        when(orderService.getOrderById("ord-123")).thenReturn(mockOrder);

        TableSessionEntity session = TableSessionEntity.builder()
                .sessionToken("tok-guest-abc")
                .build();
        session.setId("sess-primary-id");

        when(tableSessionRepository.findBySessionToken("tok-guest-abc")).thenReturn(Optional.of(session));

        OrderResponse result = orderController.getOrderById("ord-123", "tok-guest-abc", null);

        assertNotNull(result);
        assertEquals("ord-123", result.getId());
        assertEquals("sess-primary-id", result.getTableSessionId());
    }

    @Test
    @DisplayName("Customer passing mismatched session token should be denied access")
    void getOrderById_WithMismatchedSessionToken_ThrowsAccessDenied() {
        when(orderService.getOrderById("ord-123")).thenReturn(mockOrder);

        TableSessionEntity otherTableSession = TableSessionEntity.builder()
                .sessionToken("tok-table-2")
                .build();
        otherTableSession.setId("sess-different-id");

        when(tableSessionRepository.findBySessionToken("tok-table-2")).thenReturn(Optional.of(otherTableSession));

        assertThrows(AccessDeniedException.class, () ->
                orderController.getOrderById("ord-123", "tok-table-2", null)
        );
    }

    @Test
    @DisplayName("Guest takeaway order without tableSessionId and customerId can be accessed by valid order ID")
    void getOrderById_GuestTakeawayOrder_Success() {
        mockOrder.setOrderType(OrderType.takeaway);
        mockOrder.setTableSessionId(null);
        mockOrder.setCustomerId(null);

        when(orderService.getOrderById("ord-takeaway")).thenReturn(mockOrder);

        OrderResponse result = orderController.getOrderById("ord-takeaway", null, null);

        assertNotNull(result);
        assertEquals("ord-123", result.getId());
    }

    @Test
    @DisplayName("Access to registered customer's order without staff key or matching customer should be denied")
    void getOrderById_RegisteredCustomerOrder_WithoutCredentials_ThrowsAccessDenied() {
        mockOrder.setCustomerId("cust-registered-01");

        when(orderService.getOrderById("ord-123")).thenReturn(mockOrder);

        assertThrows(AccessDeniedException.class, () ->
                orderController.getOrderById("ord-123", null, null)
        );
    }

    @Test
    @DisplayName("Customer with session token can get their session orders in getAllOrders")
    void getAllOrders_WithSessionToken_Success() {
        when(orderService.getOrdersBySession("tok-session-123")).thenReturn(List.of(mockOrder));

        List<OrderResponse> results = orderController.getAllOrders(null, "tok-session-123", null);

        assertNotNull(results);
        assertEquals(1, results.size());
        verify(orderService).getOrdersBySession("tok-session-123");
    }

    @Test
    @DisplayName("Staff can update order status with autoPay parameter")
    void updateOrderStatus_WithAutoPay_Success() {
        mockOrder.setStatus(OrderStatus.completed);
        mockOrder.setPaymentStatus(PaymentStatus.paid);

        when(orderService.updateOrderStatus("ord-123", OrderStatus.completed, true)).thenReturn(mockOrder);

        OrderResponse result = orderController.updateOrderStatus("ord-123", OrderStatus.completed, true, CONFIGURED_STAFF_KEY);

        assertNotNull(result);
        assertEquals(OrderStatus.completed, result.getStatus());
        assertEquals(PaymentStatus.paid, result.getPaymentStatus());
        verify(orderService).updateOrderStatus("ord-123", OrderStatus.completed, true);
    }

    @Test
    @DisplayName("Staff can confirm payment directly via confirmOrderPayment endpoint")
    void confirmOrderPayment_Success() {
        mockOrder.setStatus(OrderStatus.completed);
        mockOrder.setPaymentStatus(PaymentStatus.paid);

        when(orderService.confirmOrderPayment(
                eq("ord-123"),
                eq(com.omniresto.backend.domain.enums.PaymentMethod.cash),
                eq(BigDecimal.valueOf(150000)),
                eq(true),
                eq("STAFF-01"),
                eq(false)
        )).thenReturn(mockOrder);

        OrderResponse result = orderController.confirmOrderPayment(
                "ord-123",
                "cash",
                BigDecimal.valueOf(150000),
                true,
                false,
                CONFIGURED_STAFF_KEY,
                "STAFF-01"
        );

        assertNotNull(result);
        assertEquals(PaymentStatus.paid, result.getPaymentStatus());
        assertEquals(OrderStatus.completed, result.getStatus());
        verify(orderService).confirmOrderPayment("ord-123", com.omniresto.backend.domain.enums.PaymentMethod.cash, BigDecimal.valueOf(150000), true, "STAFF-01", false);
    }
}
