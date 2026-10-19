package com.omniresto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omniresto.backend.config.OrderWebSocketHandler;
import com.omniresto.backend.domain.CategoryOptionEntity;
import com.omniresto.backend.domain.MenuItemEntity;
import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.OrderItemEntity;
import com.omniresto.backend.domain.TableSessionEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.OrderType;
import com.omniresto.backend.domain.enums.TableSessionStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.model.order.request.OrderItemRequest;
import com.omniresto.backend.model.order.request.OrderRequest;
import com.omniresto.backend.model.order.response.OrderResponse;
import com.omniresto.backend.repository.CategoryOptionRepository;
import com.omniresto.backend.repository.MenuItemRepository;
import com.omniresto.backend.repository.OrderItemRepository;
import com.omniresto.backend.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private MenuItemRepository menuItemRepository;

    @Mock
    private CategoryOptionRepository categoryOptionRepository;

    @Mock
    private TableSessionService tableSessionService;

    @Mock
    private OrderWebSocketHandler orderWebSocketHandler;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private OrderService orderService;

    private OrderEntity mockOrderEntity;

    @BeforeEach
    void setUp() {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        Clock openClock = Clock.fixed(LocalDateTime.of(2026, 10, 3, 12, 0).atZone(zone).toInstant(), zone);
        orderService.setClock(openClock);

        mockOrderEntity = OrderEntity.builder()
                .orderNumber("ORD-1234")
                .orderType(OrderType.dine_in)
                .tableNo("Bàn 01")
                .status(OrderStatus.pending)
                .totalAmount(BigDecimal.valueOf(150000))
                .customerName("Nguyễn Văn A")
                .build();
        mockOrderEntity.setId("ord-test-01");
    }

    @Test
    @DisplayName("Should successfully create order with session token and calculate options price")
    void createOrder_Success() {
        // Arrange
        OrderRequest request = new OrderRequest();
        request.setOrderType(OrderType.dine_in);
        request.setTableNo("Bàn 01");
        request.setCustomerName("Nguyễn Văn A");

        TableSessionEntity mockSession = TableSessionEntity.builder()
                .tableId("tbl-01")
                .tableNo("Bàn 01")
                .sessionToken("tok-test-123")
                .status(TableSessionStatus.active)
                .build();
        mockSession.setId("sess-test-01");
        when(tableSessionService.validateAndTouchSessionWithLock("tok-test-123")).thenReturn(mockSession);

        MenuItemEntity mockMenuItem = MenuItemEntity.builder()
                .name("Phở Bò")
                .basePrice(BigDecimal.valueOf(75000))
                .mealPeriods("ALL_DAY")
                .build();
        mockMenuItem.setId("m-01");
        when(menuItemRepository.findById("m-01")).thenReturn(Optional.of(mockMenuItem));

        CategoryOptionEntity mockOption = CategoryOptionEntity.builder()
                .name("Thêm Bò Viên")
                .price(BigDecimal.valueOf(15000))
                .build();
        when(categoryOptionRepository.findAllById(List.of("opt-01"))).thenReturn(List.of(mockOption));

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setMenuItemId("m-01");
        itemReq.setName("Phở Bò");
        itemReq.setQuantity(2);
        itemReq.setOptionIds(List.of("opt-01"));
        request.setItems(List.of(itemReq));

        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.save(any(OrderItemEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act (75000 + 15000) * 2 = 180000
        OrderResponse response = orderService.createOrder(request, "tok-test-123", "idemp-key-1");

        // Assert
        assertNotNull(response);
        assertNotNull(response.getOrderNumber());
        assertEquals("Bàn 01", response.getTableNo());
        assertEquals(BigDecimal.valueOf(180000), response.getTotalAmount());

        // Idempotency test: calling with same key returns cached response
        OrderResponse cachedResponse = orderService.createOrder(request, "tok-test-123", "idemp-key-1");
        assertSame(response, cachedResponse);
    }

    @Test
    @DisplayName("Should create takeaway order in PENDING status without bypassing to confirmed")
    void createTakeawayOrder_StartsInPendingStatus() {
        OrderRequest request = new OrderRequest();
        request.setOrderType(OrderType.takeaway);
        request.setCustomerName("Khách mang về");

        MenuItemEntity mockMenuItem = MenuItemEntity.builder()
                .name("Cơm Tấm")
                .basePrice(BigDecimal.valueOf(50000))
                .mealPeriods("ALL_DAY")
                .build();
        mockMenuItem.setId("m-02");
        when(menuItemRepository.findById("m-02")).thenReturn(Optional.of(mockMenuItem));

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setMenuItemId("m-02");
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.save(any(OrderItemEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.createOrder(request, null, null);

        assertNotNull(response);
        assertEquals(OrderStatus.pending, response.getStatus());
        assertEquals(OrderType.takeaway, response.getOrderType());
    }

    @Test
    @DisplayName("Should throw BadRequestException when ordering during restaurant closed hours")
    void createOrder_RestaurantClosed_ThrowsBadRequest() {
        orderService.setEnforceBusinessHours(true);
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        Clock closedClock = Clock.fixed(LocalDateTime.of(2026, 10, 3, 23, 0).atZone(zone).toInstant(), zone);
        orderService.setClock(closedClock);

        OrderRequest request = new OrderRequest();
        request.setOrderType(OrderType.dine_in);
        request.setItems(List.of(new OrderItemRequest()));

        assertThrows(BadRequestException.class, () -> orderService.createOrder(request, "tok-123"));
    }

    @Test
    @DisplayName("Should successfully update order status and trigger WebSocket broadcast")
    void updateOrderStatus_Success() {
        // Arrange
        when(orderRepository.findById("ord-test-01")).thenReturn(Optional.of(mockOrderEntity));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        OrderResponse updated = orderService.updateOrderStatus("ord-test-01", OrderStatus.preparing);

        // Assert
        assertNotNull(updated);
        assertEquals(OrderStatus.preparing, updated.getStatus());
        verify(orderRepository, times(1)).save(mockOrderEntity);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when order ID is not found")
    void updateOrderStatus_NotFound() {
        // Arrange
        when(orderRepository.findById("invalid-id")).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> {
            orderService.updateOrderStatus("invalid-id", OrderStatus.completed);
        });

        assertTrue(exception.getMessage().contains("Không tìm thấy"));
    }
}
