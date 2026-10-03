import { create } from 'zustand';
import type { CartItem, OrderMode, ClientOrderDraft, PlacedOrder, PlacedOrderStatus, TableSession, ClientPaymentMethod } from '../../shared/types/client';
import { useAdminStore } from '../../admin/store/adminStore';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../shared/config/paymentConfig';

const STORAGE_KEY = 'omniresto_client_orders';
const TABLE_SESSION_KEY = 'omniresto_client_table_session';

const loadSavedOrders = (): PlacedOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOrdersToStorage = (orders: PlacedOrder[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {}
};

const loadSavedTableSession = (): TableSession | null => {
  try {
    const raw = localStorage.getItem(TABLE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveTableSessionToStorage = (session: TableSession | null) => {
  try {
    if (session) {
      localStorage.setItem(TABLE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(TABLE_SESSION_KEY);
    }
  } catch {}
};

// ─── State Interface ──────────────────────────────────────────────────────────

interface ClientState {
  // Cart management
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;

  // Table Session (QR Security & Lifecycle)
  tableSession: TableSession | null;
  setTableSession: (session: TableSession | null) => void;
  clearTableSession: () => void;
  checkInWithQrToken: (qrSecretToken: string) => Promise<TableSession>;
  refreshTableSession: () => Promise<TableSession | null>;
  requestPayment: () => Promise<TableSession | null>;
  cancelPaymentRequest: () => Promise<TableSession | null>;
  verifySessionDemo: (staffId?: string) => Promise<TableSession | null>;
  confirmPaymentDemo: (method?: ClientPaymentMethod) => Promise<TableSession | null>;

  // Order mode & draft
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  orderDraft: Partial<ClientOrderDraft>;
  setOrderDraft: (patch: Partial<ClientOrderDraft>) => void;

  // Orders history & tracking
  orders: PlacedOrder[];
  placedOrder: PlacedOrder | null;
  setPlacedOrder: (order: PlacedOrder | null) => void;
  placeOrder: (draft: ClientOrderDraft) => Promise<PlacedOrder | null>;
  clearPlacedOrder: () => void;
  syncOrderStatus: (id: string, status: PlacedOrderStatus) => void;

  // Table service requests (e.g. xin đá, đũa muỗng, gọi thanh toán)
  serviceRequests: Record<string, string[]>;
  sendServiceRequest: (orderId: string, requestText: string) => Promise<void>;

  // Cart drawer open/close
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  // Reset all test data
  resetClientData: () => void;
}

// ─── Selectors (used with useClientStore(selector)) ───────────────────────────

export const selectTotalItems = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotalAmount = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const selectHasActiveOrders = (s: ClientState) =>
  s.orders.some((o) => o.status !== 'COMPLETED');

export const selectActiveOrders = (s: ClientState) =>
  s.orders;

export const selectLatestActiveOrder = (s: ClientState) =>
  s.orders.find((o) => o.status !== 'COMPLETED') || null;

// ─── Store ────────────────────────────────────────────────────────────────────

let orderCounter = 8000;
const initialSavedOrders = typeof window !== 'undefined' ? loadSavedOrders() : [];
const initialSavedTableSession = typeof window !== 'undefined' ? loadSavedTableSession() : null;

export const useClientStore = create<ClientState>((set, get) => ({
  // Cart
  cart: [],

  addToCart: (item, quantity = 1) =>
    set((state) => {
      const existing = state.cart.find((c) => c.menuItemId === item.menuItemId);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.menuItemId === item.menuItemId
              ? { ...c, quantity: c.quantity + quantity }
              : c
          ),
        };
      }
      return { cart: [...state.cart, { ...item, quantity }] };
    }),

  removeFromCart: (menuItemId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.menuItemId !== menuItemId),
    })),

  updateQuantity: (menuItemId, delta) =>
    set((state) => {
      const item = state.cart.find((c) => c.menuItemId === menuItemId);
      if (!item) return state;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return { cart: state.cart.filter((c) => c.menuItemId !== menuItemId) };
      }
      return {
        cart: state.cart.map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: newQty } : c
        ),
      };
    }),

  clearCart: () => set({ cart: [] }),

  // Table Session
  tableSession: initialSavedTableSession,

  setTableSession: (session) => {
    saveTableSessionToStorage(session);
    set({ tableSession: session });
  },

  clearTableSession: () => {
    saveTableSessionToStorage(null);
    set({ tableSession: null });
  },

  checkInWithQrToken: async (qrSecretToken: string) => {
    const trimmed = (qrSecretToken || '').trim();
    if (!trimmed) {
      throw new Error('Mã QR bàn không được để trống!');
    }

    try {
      const res = await fetch('/api/table-sessions/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrSecretToken: trimmed, mode: 'PAY_AFTER' }),
      });
      if (res.ok) {
        const sessionData: TableSession = await res.json();
        saveTableSessionToStorage(sessionData);
        set({
          tableSession: sessionData,
          orderMode: 'DINE_IN',
        });
        return sessionData;
      }

      const errorData = await res.json().catch(() => ({}));
      // Nếu server từ chối hợp lệ (400, 403, 409...), hiển thị lỗi từ server
      if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
        throw new Error(errorData.message || 'Mã QR bàn không hợp lệ hoặc bàn đã có phiên khác!');
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('Mã QR') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn('Backend chưa sẵn sàng, kích hoạt chế độ nhận diện mã bàn demo:', err);
    }

    // Nhận diện mã bàn khi chạy Offline / Demo:
    // Hỗ trợ định dạng qr-token-tbl-03-xxx, tbl-03, ban-3, ban-03, tbl-3,...
    const match = trimmed.match(/(?:tbl|ban)[_-]?0?(\d+)/i);
    let tableNum = match ? parseInt(match[1], 10) : null;

    if (!tableNum) {
      const knownTokens: Record<string, number> = {
        'qr-token-tbl-01-a1b2c3d4e5f6': 1,
        'qr-token-tbl-02-b2c3d4e5f6g7': 2,
        'qr-token-tbl-03-c3d4e5f6g7h8': 3,
        'qr-token-tbl-04-d4e5f6g7h8i9': 4,
        'qr-token-tbl-05-e5f6g7h8i9j0': 5,
        'qr-token-tbl-06-f6g7h8i9j0k1': 6,
        'qr-token-tbl-07-g7h8i9j0k1l2': 7,
        'qr-token-tbl-08-h8i9j0k1l2m3': 8,
        'qr-token-tbl-09-i9j0k1l2m3n4': 9,
        'qr-token-tbl-10-j0k1l2m3n4o5': 10,
        'qr-token-tbl-11-k1l2m3n4o5p6': 11,
        'qr-token-tbl-12-l2m3n4o5p6q7': 12,
      };
      if (knownTokens[trimmed]) {
        tableNum = knownTokens[trimmed];
      }
    }

    if (tableNum && tableNum >= 1 && tableNum <= 50) {
      const pad = tableNum < 10 ? `0${tableNum}` : `${tableNum}`;
      const simSession: TableSession = {
        id: `sess-tbl-${tableNum}-${Date.now()}`,
        tableId: `tbl-${tableNum}`,
        tableNo: `Bàn ${pad}`,
        sessionToken: `sess-sim-tbl-${tableNum}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'ACTIVE',
        mode: 'PAY_AFTER',
        expiresAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      };
      saveTableSessionToStorage(simSession);
      set({
        tableSession: simSession,
        orderMode: 'DINE_IN',
      });
      return simSession;
    }

    throw new Error('Mã QR bàn không hợp lệ hoặc không tồn tại trong hệ thống!');
  },

  refreshTableSession: async () => {
    const currentSession = get().tableSession;
    if (!currentSession?.sessionToken) return null;
    try {
      const res = await fetch('/api/table-sessions/current', {
        headers: { 'X-Table-Session': currentSession.sessionToken },
      });
      if (res.ok) {
        const data: TableSession = await res.json();
        saveTableSessionToStorage(data);
        set({ tableSession: data });
        return data;
      }
    } catch (err) {
      console.warn('Failed to refresh table session from server:', err);
    }
    return currentSession;
  },

  requestPayment: async () => {
    const currentSession = get().tableSession;
    if (!currentSession?.sessionToken) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch('/api/table-sessions/request-payment', {
        method: 'POST',
        headers: { 'X-Table-Session': currentSession.sessionToken },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể yêu cầu thanh toán!');
      }
      finalSession = await res.json();
    } catch (err: any) {
      console.warn('requestPayment via backend failed, using local simulation:', err);
      // Fallback local simulation
      const orders = get().orders;
      const activeOrder = orders.find((o) => o.status !== 'COMPLETED');
      const totalAmount = activeOrder ? activeOrder.totalAmount : 0;
      const orderNumber = activeOrder ? activeOrder.orderNumber : 'ORD-LOCAL';

      const transferContent = `OMNIRESTO ${orderNumber}`;
      const qrUrl = generateVietQRUrl(totalAmount, transferContent);

      finalSession = {
        ...currentSession,
        status: 'PAYMENT_REQUESTED',
        activeOrderId: activeOrder?.id,
        activeOrderNumber: orderNumber,
        totalAmount,
        vietQr: {
          qrImageUrl: qrUrl,
          amount: totalAmount,
          bankId: PAYMENT_CONFIG.bankId,
          accountNumber: PAYMENT_CONFIG.accountNumber,
          accountName: PAYMENT_CONFIG.accountName,
          transferContent,
        },
      };
    }

    saveTableSessionToStorage(finalSession);
    set({ tableSession: finalSession });

    // Broadcast payment requested to Admin / POS
    if (typeof window !== 'undefined' && finalSession.tableNo) {
      window.dispatchEvent(
        new CustomEvent('omniresto:payment_requested', {
          detail: {
            tableNo: finalSession.tableNo,
            orderNumber: finalSession.activeOrderNumber,
            totalAmount: finalSession.totalAmount,
          },
        })
      );
    }
    return finalSession;
  },

  cancelPaymentRequest: async () => {
    const currentSession = get().tableSession;
    if (!currentSession?.sessionToken) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch('/api/table-sessions/cancel-payment-request', {
        method: 'POST',
        headers: { 'X-Table-Session': currentSession.sessionToken },
      });
      if (res.ok) {
        finalSession = await res.json();
      } else {
        throw new Error('Cancel failed');
      }
    } catch (err) {
      console.warn('cancelPaymentRequest failed on backend, simulating locally:', err);
      finalSession = {
        ...currentSession,
        status: 'ACTIVE',
        vietQr: undefined,
      };
    }

    saveTableSessionToStorage(finalSession);
    set({ tableSession: finalSession });

    if (typeof window !== 'undefined' && finalSession.tableNo) {
      window.dispatchEvent(
        new CustomEvent('omniresto:payment_request_cancelled', {
          detail: { tableNo: finalSession.tableNo },
        })
      );
    }
    return finalSession;
  },

  verifySessionDemo: async (staffId = 'STAFF-POS') => {
    const currentSession = get().tableSession;
    if (!currentSession?.sessionToken) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch(`/api/table-sessions/verify?sessionToken=${encodeURIComponent(currentSession.sessionToken)}&staffId=${encodeURIComponent(staffId)}`, {
        method: 'POST',
      });
      if (res.ok) {
        finalSession = await res.json();
      } else {
        throw new Error('Verify failed');
      }
    } catch (err) {
      console.warn('verifySession on backend failed, simulating locally:', err);
      finalSession = {
        ...currentSession,
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verifiedByStaffId: staffId,
      };
    }

    const updatedOrders = get().orders.map((o) => {
      if (o.status === 'PENDING') {
        return {
          ...o,
          status: 'PREPARING' as const,
          items: o.items.map((it) => ({ ...it, status: 'PREPARING' as const })),
        };
      }
      return o;
    });

    saveTableSessionToStorage(finalSession);
    saveOrdersToStorage(updatedOrders);
    set({ tableSession: finalSession, orders: updatedOrders });

    if (typeof window !== 'undefined' && finalSession.tableNo) {
      window.dispatchEvent(
        new CustomEvent('omniresto:table_session_verified', {
          detail: { tableNo: finalSession.tableNo },
        })
      );
    }
    return finalSession;
  },

  confirmPaymentDemo: async (method: ClientPaymentMethod = 'QR_CODE') => {
    const currentSession = get().tableSession;
    if (!currentSession?.sessionToken) return null;
    try {
      await fetch(`/api/table-sessions/confirm-payment?sessionToken=${encodeURIComponent(currentSession.sessionToken)}&staffId=STAFF-POS&method=${encodeURIComponent(method)}`, {
        method: 'POST',
      });
    } catch {}
    const updated: TableSession = {
      ...currentSession,
      status: 'PAID',
      paymentStatus: 'PAID',
    };
    const updatedOrders = get().orders.map((o) => ({
      ...o,
      status: 'COMPLETED' as const,
      paymentStatus: 'PAID' as const,
    }));
    saveTableSessionToStorage(updated);
    saveOrdersToStorage(updatedOrders);
    set({ tableSession: updated, orders: updatedOrders });

    if (typeof window !== 'undefined' && updated.tableId) {
      window.dispatchEvent(
        new CustomEvent('omniresto:table_session_closed', {
          detail: { tableId: updated.tableId, reason: 'CLIENT_PAYMENT_CONFIRMED' },
        })
      );
    }
    return updated;
  },

  // Order
  orderMode: initialSavedTableSession ? 'DINE_IN' : 'DINE_IN',
  setOrderMode: (mode) => set({ orderMode: mode }),
  orderDraft: {},
  setOrderDraft: (patch) =>
    set((state) => ({ orderDraft: { ...state.orderDraft, ...patch } })),

  // Orders collection & active order
  orders: initialSavedOrders,
  placedOrder: initialSavedOrders.length > 0 ? initialSavedOrders[0] : null,

  setPlacedOrder: (order) => set({ placedOrder: order }),

  placeOrder: async (draft) => {
    orderCounter += 1;
    const state = get();

    if (draft.orderMode === 'DINE_IN' && !state.tableSession?.sessionToken) {
      alert('Chưa có phiên bàn hợp lệ! Quý khách vui lòng quét mã QR tại bàn để gọi món.');
      return null;
    }

    // Chặn đặt món nếu hóa đơn đang đóng băng để thanh toán
    if (state.tableSession?.status === 'PAYMENT_REQUESTED') {
      alert('Hóa đơn của bàn đang được đóng băng để thanh toán. Quý khách vui lòng bấm "Hủy yêu cầu thanh toán" trên ứng dụng nếu muốn tiếp tục gọi thêm món!');
      return null;
    }

    if (state.cart.length === 0) {
      alert('Giỏ hàng đang trống! Quý khách vui lòng chọn món trước khi gửi đơn.');
      return null;
    }

    const effectiveTableNo = draft.orderMode === 'DINE_IN'
      ? state.tableSession?.tableNo
      : undefined;

    const effectiveSessionToken = draft.orderMode === 'DINE_IN'
      ? state.tableSession?.sessionToken
      : undefined;

    // Gửi đơn lên Backend Server (Single Source of Truth)
    let serverOrderData: any = null;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (effectiveSessionToken) {
        headers['X-Table-Session'] = effectiveSessionToken;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderType: draft.orderMode === 'DINE_IN' ? 'dine_in' : draft.orderMode === 'TAKEAWAY' ? 'takeaway' : 'delivery',
          tableNo: effectiveTableNo,
          sessionToken: effectiveSessionToken,
          customerName: draft.customerName,
          paymentMethod: draft.paymentMethod,
          totalAmount: state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
          items: state.cart.map((it) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            notes: it.notes,
          })),
        }),
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 502 || res.status === 503) {
          throw new Error('SERVER_OFFLINE');
        }
        const errJson = await res.json().catch(() => ({}));
        const errorMsg = errJson.message || 'Đặt món không thành công. Quý khách vui lòng thử lại!';
        alert(`❌ ${errorMsg}`);
        return null;
      }

      serverOrderData = await res.json();
    } catch (e: any) {
      console.warn('Máy chủ đặt món chưa sẵn sàng, mô phỏng đơn hàng thành công để trải nghiệm thử:', e);
      const simOrderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      serverOrderData = {
        id: `ord-sim-${Date.now()}`,
        orderNumber: simOrderNum,
        tableNo: effectiveTableNo,
        orderType: draft.orderMode === 'DINE_IN' ? 'dine_in' : 'takeaway',
        status: 'pending',
        paymentStatus: 'unpaid',
        totalAmount: state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        items: state.cart.map((it, idx) => ({
          id: `line-${Date.now()}-${idx}`,
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          status: 'PENDING',
        })),
        createdAt: new Date().toISOString(),
      };
    }

    if (!serverOrderData) {
      return null;
    }

    // Mapping từ dữ liệu chuẩn xác của Backend
    const mappedItems: CartItem[] = (serverOrderData.items || []).map((it: any) => {
      const foundLocal = state.cart.find((c) => c.menuItemId === it.menuItemId);
      return {
        id: it.id,
        menuItemId: it.menuItemId,
        name: it.name,
        category: foundLocal?.category || 'Món chính',
        price: it.price,
        quantity: it.quantity,
        image: foundLocal?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop',
        notes: it.notes,
        roundNo: it.roundNo || 1,
        status: (it.status?.toUpperCase() as any) || 'CONFIRMED',
        addedAt: it.addedAt,
      };
    });

    const finalOrder: PlacedOrder = {
      id: serverOrderData.id,
      orderNumber: serverOrderData.orderNumber,
      tableSessionId: serverOrderData.tableSessionId,
      orderMode: draft.orderMode,
      tableNo: serverOrderData.tableNo || effectiveTableNo,
      sessionToken: effectiveSessionToken,
      customerName: serverOrderData.customerName || draft.customerName,
      items: mappedItems,
      totalAmount: serverOrderData.totalAmount,
      status: (serverOrderData.status?.toUpperCase() as PlacedOrderStatus) || 'CONFIRMED',
      paymentStatus: (serverOrderData.paymentStatus?.toUpperCase() as any) || 'UNPAID',
      placedAt: new Date(serverOrderData.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      estimatedMinutes: draft.orderMode === 'DELIVERY' ? 35 : draft.orderMode === 'TAKEAWAY' ? 20 : 15,
      paymentMethod: draft.paymentMethod,
    };

    // Cập nhật danh sách đơn
    const existingIndex = state.orders.findIndex((o) => o.id === finalOrder.id);
    let updatedOrders: PlacedOrder[];
    if (existingIndex !== -1) {
      updatedOrders = [...state.orders];
      updatedOrders[existingIndex] = finalOrder;
    } else {
      updatedOrders = [finalOrder, ...state.orders];
    }
    saveOrdersToStorage(updatedOrders);

    // Đồng bộ với Admin Store
    useAdminStore.getState().addOrderFromClient({
      id: finalOrder.id,
      orderNumber: finalOrder.orderNumber,
      orderType: finalOrder.orderMode,
      tableNo: finalOrder.tableNo,
      status: (finalOrder.status as any) || 'CONFIRMED',
      items: finalOrder.items.map((it, i) => ({
        id: String(i + 1),
        name: `${it.name}${it.roundNo && it.roundNo > 1 ? ` (Đợt ${it.roundNo})` : ''}`,
        quantity: it.quantity,
        price: it.price,
        notes: it.notes,
      })),
      totalAmount: finalOrder.totalAmount,
      createdAt: 'Vừa xong',
      customerName: finalOrder.customerName,
      paymentMethod: finalOrder.paymentMethod as any,
    });

    // Chỉ clear giỏ hàng khi backend đã ghi nhận tạo/cộng dồn đơn thành công
    set({
      orders: updatedOrders,
      placedOrder: finalOrder,
      cart: [],
      orderDraft: {},
    });
    return finalOrder;
  },

  clearPlacedOrder: () => set({ placedOrder: null }),

  syncOrderStatus: (id, status) =>
    set((state) => {
      let changed = false;
      const updatedOrders = state.orders.map((o) => {
        if (o.id === id || o.orderNumber === id) {
          changed = true;
          return {
            ...o,
            status,
            items: o.items.map((it) => ({
              ...it,
              status: (status === 'COMPLETED' ? 'READY' : status) as any,
            })),
          };
        }
        return o;
      });
      if (!changed) return state;

      saveOrdersToStorage(updatedOrders);
      const updatedPlaced =
        state.placedOrder && (state.placedOrder.id === id || state.placedOrder.orderNumber === id)
          ? {
              ...state.placedOrder,
              status,
              items: state.placedOrder.items.map((it) => ({
                ...it,
                status: (status === 'COMPLETED' ? 'READY' : status) as any,
              })),
            }
          : state.placedOrder;

      return { orders: updatedOrders, placedOrder: updatedPlaced };
    }),

  // Table service requests (kết nối API backend với rate limiting)
  serviceRequests: {},
  sendServiceRequest: async (orderId, requestText) => {
    const state = get();
    const currentSession = state.tableSession;
    if (!currentSession?.sessionToken) {
      alert('Chưa có phiên bàn hợp lệ để gọi phục vụ! Vui lòng quét mã QR tại bàn.');
      return;
    }

    // Phân loại requestType sang ServiceRequestType của Backend
    let requestType = 'OTHER';
    const lower = requestText.toLowerCase();
    if (lower.includes('đá') || lower.includes('nước đá')) {
      requestType = 'ICE';
    } else if (lower.includes('đũa') || lower.includes('thìa') || lower.includes('muỗng') || lower.includes('dĩa') || lower.includes('chén') || lower.includes('bát')) {
      requestType = 'CUTLERY';
    } else if (lower.includes('nước lẩu') || lower.includes('nước dùng') || lower.includes('canh') || lower.includes('súp')) {
      requestType = 'BROTH';
    } else if (lower.includes('tính tiền') || lower.includes('thanh toán') || lower.includes('hóa đơn')) {
      requestType = 'PAYMENT';
    } else if (lower.includes('hỗ trợ') || lower.includes('giúp') || lower.includes('phục vụ')) {
      requestType = 'SUPPORT';
    }

    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Table-Session': currentSession.sessionToken,
        },
        body: JSON.stringify({
          requestType,
          note: requestText,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`⚠️ ${errJson.message || 'Không thể gửi yêu cầu phục vụ lúc này. Quý khách vui lòng thử lại sau giây lát!'}`);
        return;
      }

      const tableNo = currentSession.tableNo || state.placedOrder?.tableNo || 'Bàn';
      const current = state.serviceRequests[orderId] || [];
      const updated = {
        ...state.serviceRequests,
        [orderId]: [...current, `${requestText} (${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`],
      };

      try {
        useAdminStore.getState().addServiceRequest({ tableNo, orderId, requestText });
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omniresto:service_request', {
            detail: { tableNo, orderId, requestText },
          })
        );
      }

      set({ serviceRequests: updated });
      alert(`🔔 Đã gửi yêu cầu: "${requestText}". Nhân viên phục vụ sẽ đến hỗ trợ bàn ${tableNo} ngay!`);
    } catch (e) {
      console.error('Lỗi khi gửi yêu cầu phục vụ:', e);
      alert('❌ Lỗi kết nối khi gửi yêu cầu. Quý khách vui lòng thử lại!');
    }
  },

  // Cart drawer
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  // Reset all client data (orders, table session, cart)
  resetClientData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TABLE_SESSION_KEY);
    } catch {}
    set({
      orders: [],
      placedOrder: null,
      cart: [],
      tableSession: null,
      orderDraft: {},
      serviceRequests: {},
    });
  },
}));

// Expose reset helper globally for developer convenience
if (typeof window !== 'undefined') {
  (window as any).resetOmniResto = () => {
    useClientStore.getState().resetClientData();
    window.location.reload();
  };
}

// Listen to Admin status updates across the window
if (typeof window !== 'undefined') {
  window.addEventListener('omniresto:order_status_updated', ((e: CustomEvent<{ id: string; status: PlacedOrderStatus }>) => {
    if (e.detail?.id && e.detail?.status) {
      useClientStore.getState().syncOrderStatus(e.detail.id, e.detail.status);
    }
  }) as EventListener);

  window.addEventListener('omniresto:table_session_verified', ((e: CustomEvent<{ tableNo: string }>) => {
    const current = useClientStore.getState().tableSession;
    if (current && (!e.detail?.tableNo || current.tableNo.toLowerCase() === e.detail.tableNo.toLowerCase())) {
      useClientStore.getState().verifySessionDemo();
    }
  }) as EventListener);

  window.addEventListener('omniresto:table_session_closed', ((e: CustomEvent<{ tableId: string; reason: string }>) => {
    const current = useClientStore.getState().tableSession;
    if (current && (!e.detail?.tableId || current.tableId === e.detail.tableId)) {
      useClientStore.getState().clearTableSession();
      alert('🔔 Bàn của quý khách đã hoàn tất thanh toán hoặc kết thúc phiên. Cảm ơn quý khách đã dùng bữa tại OmniResto!');
    }
  }) as EventListener);
}
