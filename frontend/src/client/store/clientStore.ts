import { create } from 'zustand';
import type { CartItem, CartItemOption, OrderMode, ClientOrderDraft, PlacedOrder, PlacedOrderStatus, TableSession, ClientPaymentMethod } from '../../shared/types/client';
import { useAdminStore } from '../../admin/store/adminStore';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../shared/config/paymentConfig';
import { checkIsItemAvailableNow } from '../utils/mealPeriodUtils';

const STORAGE_KEY = 'omniresto_client_orders';
const TABLE_SESSION_KEY = 'omniresto_client_table_session';
const DEVICE_TOKEN_KEY = 'omniresto_device_token';

export const getOrCreateDeviceToken = (): string => {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      token = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'dev_' + Date.now().toString(36);
  }
};

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
  } catch { }
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
  } catch { }
};

export const mapServerOrderToPlacedOrder = (serverOrderData: any, existingOrder?: PlacedOrder | null): PlacedOrder => {
  const rawStatus = (serverOrderData.status || existingOrder?.status || 'pending').toLowerCase() as PlacedOrderStatus;
  const isCancelled = rawStatus === 'cancelled';

  const mappedItems: CartItem[] = (serverOrderData.items || []).map((it: any) => {
    const existingItem = existingOrder?.items?.find((c) => (c.menu_item_id || c.id) === (it.menu_item_id || it.id));
    const itemStatus = isCancelled ? 'cancelled' : ((it.status?.toLowerCase() as any) || 'confirmed');
    const rawOptions = it.options || existingItem?.options || [];
    const mappedOptions: CartItemOption[] = rawOptions.map((opt: any) => ({
      id: opt.id,
      option_id: opt.option_id || opt.id,
      option_name: opt.option_name || opt.name,
      option_type: opt.option_type,
      price: Number(opt.price || 0),
    }));

    return {
      id: it.id,
      menu_item_id: it.menu_item_id || it.id,
      name: it.name,
      category: existingItem?.category || 'Món chính',
      price: Number(it.price || 0),
      quantity: it.quantity || 1,
      image: existingItem?.image || '/images/food-placeholder.svg',
      notes: it.notes,
      round_no: it.round_no || 1,
      status: itemStatus,
      added_at: it.added_at,
      options: mappedOptions,
      option_ids: mappedOptions.map((o) => o.option_id || o.id!).filter(Boolean),
    };
  });

  const rawMode = (serverOrderData.order_mode || serverOrderData.order_type || existingOrder?.order_mode || 'dine_in').toLowerCase();
  const orderMode: OrderMode = rawMode === 'takeaway' ? 'takeaway' : rawMode === 'delivery' ? 'delivery' : 'dine_in';

  const serverAmount = Number(serverOrderData.total_amount ?? existingOrder?.total_amount ?? 0);
  const totalAmount = isCancelled ? 0 : serverAmount;

  return {
    id: serverOrderData.id,
    order_number: serverOrderData.order_number || existingOrder?.order_number || '',
    table_session_id: serverOrderData.table_session_id || existingOrder?.table_session_id,
    order_mode: orderMode,
    table_no: serverOrderData.table_no || existingOrder?.table_no,
    session_token: serverOrderData.session_token || existingOrder?.session_token,
    customer_name: serverOrderData.customer_name || existingOrder?.customer_name,
    items: mappedItems,
    total_amount: totalAmount,
    status: rawStatus,
    payment_status: isCancelled ? 'cancelled' : (serverOrderData.payment_status?.toLowerCase() as any || 'unpaid'),
    placed_at: existingOrder?.placed_at || new Date(serverOrderData.created_at || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    estimated_minutes: existingOrder?.estimated_minutes || (orderMode === 'delivery' ? 35 : orderMode === 'takeaway' ? 20 : 15),
    payment_method: serverOrderData.payment_method || serverOrderData.paymentMethod || existingOrder?.payment_method,
  };
};

// ─── State Interface ──────────────────────────────────────────────────────────

interface ClientState {
  // Cart management
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, delta: number) => void;
  clearCart: () => void;

  // Table Session (QR Security & Lifecycle)
  table_session: TableSession | null;
  setTableSession: (session: TableSession | null) => void;
  set_table_session: (session: TableSession | null) => void;
  clearTableSession: () => void;
  clear_table_session: () => void;
  checkInWithQrToken: (qrSecretToken: string) => Promise<TableSession>;
  refreshTableSession: () => Promise<TableSession | null>;
  requestPayment: () => Promise<TableSession | null>;
  cancelPaymentRequest: () => Promise<TableSession | null>;
  verifySessionDemo: (staffId?: string) => Promise<TableSession | null>;
  confirmPaymentDemo: (method?: ClientPaymentMethod) => Promise<TableSession | null>;

  // Order mode & draft
  order_mode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  set_order_mode: (mode: OrderMode) => void;
  order_draft: Partial<ClientOrderDraft>;
  setOrderDraft: (patch: Partial<ClientOrderDraft>) => void;
  set_order_draft: (patch: Partial<ClientOrderDraft>) => void;

  // Orders history & tracking
  orders: PlacedOrder[];
  placed_order: PlacedOrder | null;
  setPlacedOrder: (order: PlacedOrder | null) => void;
  set_placed_order: (order: PlacedOrder | null) => void;
  placeOrder: (draft: ClientOrderDraft) => Promise<PlacedOrder | null>;
  clearPlacedOrder: () => void;
  clear_placed_order: () => void;
  syncOrderStatus: (id: string, status: PlacedOrderStatus) => void;
  fetchOrderById: (orderId: string) => Promise<PlacedOrder | null>;
  fetchOrdersFromServer: () => Promise<PlacedOrder[]>;
  handleServerOrderEvent: (serverOrder: any) => void;

  // Table service requests (e.g. xin đá, đũa muỗng, gọi thanh toán)
  service_requests: Record<string, string[]>;
  sendServiceRequest: (orderId: string, requestText: string) => Promise<void>;

  // Cart drawer open/close
  is_cart_open: boolean;
  openCart: () => void;
  closeCart: () => void;

  // Reset all test data
  resetClientData: () => void;
}

// ─── Selectors (used with useClientStore(selector)) ───────────────────────────

export const selectTotalItems = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.quantity, 0);
export const select_total_items = selectTotalItems;

export const selectTotalAmount = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const select_total_amount = selectTotalAmount;

export const selectHasActiveOrders = (s: ClientState) =>
  s.orders.some((o) => o.status !== 'completed' && o.status !== 'cancelled');
export const select_has_active_orders = selectHasActiveOrders;

export const selectActiveOrders = (s: ClientState) =>
  s.orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
export const select_active_orders = selectActiveOrders;

export const selectLatestActiveOrder = (s: ClientState) =>
  s.orders.find((o) => o.status !== 'completed' && o.status !== 'cancelled') || null;
export const select_latest_active_order = selectLatestActiveOrder;

// ─── Store ────────────────────────────────────────────────────────────────────

let orderCounter = 8000;
const initialSavedOrders = typeof window !== 'undefined' ? loadSavedOrders() : [];
const initialSavedTableSession = typeof window !== 'undefined' ? loadSavedTableSession() : null;

export const useClientStore = create<ClientState>((set, get) => ({
  // Cart
  cart: [],

  addToCart: (item, quantity = 1) =>
    set((state) => {
      // Cart Guard: Chặn không cho thêm vào giỏ nếu món đã hết giờ phục vụ
      if (item.is_available_now === false || !checkIsItemAvailableNow(item)) {
        alert(`⚠️ Món "${item.name}" hiện đã quá giờ phục vụ. Quý khách vui lòng chọn các món ăn đang mở bán trong thực đơn hiện tại nhé!`);
        return state;
      }
      const itemKey = item.id || item.menu_item_id;
      const existing = state.cart.find((c) => (c.id || c.menu_item_id) === itemKey);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            (c.id || c.menu_item_id) === itemKey
              ? { ...c, quantity: c.quantity + quantity }
              : c
          ),
        };
      }
      return { cart: [...state.cart, { ...item, id: itemKey, quantity }] };
    }),

  removeFromCart: (key) =>
    set((state) => ({
      cart: state.cart.filter((c) => (c.id || c.menu_item_id) !== key),
    })),

  updateQuantity: (key, delta) =>
    set((state) => {
      const item = state.cart.find((c) => (c.id || c.menu_item_id) === key);
      if (!item) return state;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return { cart: state.cart.filter((c) => (c.id || c.menu_item_id) !== key) };
      }
      return {
        cart: state.cart.map((c) =>
          (c.id || c.menu_item_id) === key ? { ...c, quantity: newQty } : c
        ),
      };
    }),

  clearCart: () => set({ cart: [] }),

  // Table Session
  table_session: initialSavedTableSession,

  setTableSession: (session) => {
    saveTableSessionToStorage(session);
    set({ table_session: session });
  },
  set_table_session: (session) => {
    saveTableSessionToStorage(session);
    set({ table_session: session });
  },

  clearTableSession: () => {
    saveTableSessionToStorage(null);
    set({ table_session: null });
  },
  clear_table_session: () => {
    saveTableSessionToStorage(null);
    set({ table_session: null });
  },

  checkInWithQrToken: async (qrSecretToken: string) => {
    const trimmed = (qrSecretToken || '').trim();
    if (!trimmed) {
      throw new Error('Mã QR bàn không được để trống!');
    }

    const deviceToken = getOrCreateDeviceToken();

    try {
      const res = await fetch('/api/table-sessions/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_secret_token: trimmed,
          device_token: deviceToken,
          mode: 'pay_after',
        }),
      });
      if (res.ok) {
        const sessionData: TableSession = await res.json();
        saveTableSessionToStorage(sessionData);
        set({
          table_session: sessionData,
          order_mode: 'dine_in',
        });
        return sessionData;
      }

      const errorData = await res.json().catch(() => ({}));
      // Xử lý các mã lỗi cụ thể từ Server (khi Backend đang hoạt động)
      if (res.status === 409) {
        throw new Error(errorData.message || 'Bàn này hiện đang có khách sử dụng và đã được khóa bởi một thiết bị khác!');
      }
      if (res.status === 400) {
        throw new Error(errorData.message || 'Mã QR bàn không hợp lệ hoặc đã bị thay đổi!');
      }
      if (res.status === 500) {
        throw new Error(errorData.message || 'Máy chủ gặp sự cố khi kích hoạt phiên bàn!');
      }
      if (res.status !== 502 && res.status !== 503) {
        throw new Error(errorData.message || `Lỗi kích hoạt bàn (${res.status})!`);
      }
    } catch (err: any) {
      // Chỉ kích hoạt chế độ Offline/Demo nếu thực sự mất kết nối mạng hoặc server sập (Failed to fetch)
      const isNetworkFailure = !err.status && (
        err.message === 'Failed to fetch' ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch') ||
        err.name === 'TypeError'
      );

      if (!isNetworkFailure) {
        throw err;
      }
      console.warn('Backend chưa sẵn sàng hoặc không thể kết nối mạng, kích hoạt chế độ nhận diện mã bàn demo:', err);
    }

    // Nhận diện mã bàn khi chạy Offline / Demo:
    // Hỗ trợ định dạng qr-sec-tbl01-xxx, qr-token-tbl-03-xxx, tbl-03, ban-3, ban-03, tbl-3,...
    const match = trimmed.match(/(?:tbl|ban)[_-]?0?(\d+)/i);
    let tableNum = match ? parseInt(match[1], 10) : null;

    if (!tableNum) {
      const knownTokens: Record<string, number> = {
        'qr-sec-tbl01-a1b2c3d4e5f6': 1,
        'qr-sec-tbl02-b2c3d4e5f6g7': 2,
        'qr-sec-tbl03-c3d4e5f6g7h8': 3,
        'qr-sec-tbl04-d4e5f6g7h8i9': 4,
        'qr-sec-tbl05-e5f6g7h8i9j0': 5,
        'qr-sec-tbl06-f6g7h8i9j0k1': 6,
        'qr-sec-tbl07-g7h8i9j0k1l2': 7,
        'qr-sec-tbl08-h8i9j0k1l2m3': 8,
        'qr-sec-tbl09-i9j0k1l2m3n4': 9,
        'qr-sec-tbl10-j0k1l2m3n4o5': 10,
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

      // Cơ chế khóa 1 thiết bị cho Demo Offline:
      const demoLockKey = `omniresto_demo_lock_tbl_${tableNum}`;
      const existingLock = localStorage.getItem(demoLockKey);
      if (existingLock && existingLock !== deviceToken) {
        throw new Error(
          `Bàn ${pad} hiện đang có khách sử dụng và đã được khóa cho 1 thiết bị quản lý. ` +
          `Để tránh trùng lặp đơn, mỗi bàn chỉ cho phép 1 thiết bị đặt món. ` +
          `Vui lòng liên hệ nhân viên phục vụ để mở khóa bàn!`
        );
      }
      localStorage.setItem(demoLockKey, deviceToken);

      const simSession: TableSession = {
        id: `sess-tbl-${tableNum}-${Date.now()}`,
        table_id: `tbl-${tableNum}`,
        table_no: `Bàn ${pad}`,
        session_token: `sess-sim-tbl-${tableNum}-${Math.random().toString(36).substring(2, 9)}`,
        device_token: deviceToken,
        is_device_master: true,
        status: 'active',
        mode: 'pay_after',
        expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      };
      saveTableSessionToStorage(simSession);
      set({
        table_session: simSession,
        order_mode: 'dine_in',
      });
      return simSession;
    }

    throw new Error('Mã QR bàn không hợp lệ hoặc không tồn tại trong hệ thống!');
  },

  refreshTableSession: async () => {
    const currentSession = get().table_session;
    if (!currentSession?.session_token) return null;
    try {
      const res = await fetch('/api/table-sessions/current', {
        headers: { 'X-Table-Session': currentSession.session_token },
      });
      if (res.ok) {
        const data: TableSession = await res.json();
        saveTableSessionToStorage(data);
        set({ table_session: data });
        return data;
      } else if (res.status === 404) {
        // Token cũ không còn tồn tại trên server (phiên hết hạn hoặc DB mới)
        saveTableSessionToStorage(null);
        set({ table_session: null });
        return null;
      }
    } catch (err) {
      console.warn('Failed to refresh table session from server:', err);
    }
    return currentSession;
  },

  requestPayment: async () => {
    const currentSession = get().table_session;
    if (!currentSession?.session_token) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch('/api/table-sessions/request-payment', {
        method: 'POST',
        headers: { 'X-Table-Session': currentSession.session_token },
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
      const activeOrder = orders.find((o) => o.status !== 'completed' && o.status !== 'cancelled');
      const totalAmount = activeOrder ? activeOrder.total_amount : 0;
      const orderNumber = activeOrder ? activeOrder.order_number : 'ORD-LOCAL';

      const transferContent = `OMNIRESTO ${orderNumber}`;
      const qrUrl = generateVietQRUrl(totalAmount, transferContent);

      finalSession = {
        ...currentSession,
        status: 'payment_requested',
        active_order_id: activeOrder?.id,
        active_order_number: orderNumber,
        total_amount: totalAmount,
        viet_qr: {
          qr_image_url: qrUrl,
          amount: totalAmount,
          bank_id: PAYMENT_CONFIG.bankId,
          account_number: PAYMENT_CONFIG.accountNumber,
          account_name: PAYMENT_CONFIG.accountName,
          transfer_content: transferContent,
        },
      };
    }

    saveTableSessionToStorage(finalSession);
    set({ table_session: finalSession });

    // Broadcast payment requested to Admin / POS
    if (typeof window !== 'undefined' && finalSession.table_no) {
      window.dispatchEvent(
        new CustomEvent('omniresto:payment_requested', {
          detail: {
            tableNo: finalSession.table_no,
            orderNumber: finalSession.active_order_number,
            totalAmount: finalSession.total_amount,
          },
        })
      );
    }
    return finalSession;
  },

  cancelPaymentRequest: async () => {
    const currentSession = get().table_session;
    if (!currentSession?.session_token) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch('/api/table-sessions/cancel-payment-request', {
        method: 'POST',
        headers: { 'X-Table-Session': currentSession.session_token },
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
        status: 'active',
        viet_qr: undefined,
      };
    }

    saveTableSessionToStorage(finalSession);
    set({ table_session: finalSession });

    if (typeof window !== 'undefined' && finalSession.table_no) {
      window.dispatchEvent(
        new CustomEvent('omniresto:payment_request_cancelled', {
          detail: { tableNo: finalSession.table_no },
        })
      );
    }
    return finalSession;
  },

  verifySessionDemo: async (staffId = 'STAFF-POS') => {
    const currentSession = get().table_session;
    if (!currentSession?.session_token) return null;
    let finalSession: TableSession;
    try {
      const res = await fetch(`/api/table-sessions/verify?sessionToken=${encodeURIComponent(currentSession.session_token)}&staffId=${encodeURIComponent(staffId)}`, {
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
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by_staff_id: staffId,
      };
    }

    const updatedOrders = get().orders.map((o) => {
      if (o.status === 'pending') {
        return {
          ...o,
          status: 'preparing' as const,
          items: o.items.map((it) => ({ ...it, status: 'preparing' as const })),
        };
      }
      return o;
    });

    saveTableSessionToStorage(finalSession);
    saveOrdersToStorage(updatedOrders);
    set({ table_session: finalSession, orders: updatedOrders });

    if (typeof window !== 'undefined' && finalSession.table_no) {
      window.dispatchEvent(
        new CustomEvent('omniresto:table_session_verified', {
          detail: { tableNo: finalSession.table_no },
        })
      );
    }
    return finalSession;
  },

  confirmPaymentDemo: async (method: ClientPaymentMethod = 'qr_code') => {
    const currentSession = get().table_session;
    if (!currentSession?.session_token) return null;
    try {
      await fetch(`/api/table-sessions/confirm-payment?sessionToken=${encodeURIComponent(currentSession.session_token)}&staffId=STAFF-POS&method=${encodeURIComponent(method)}`, {
        method: 'POST',
      });
    } catch { }
    // Xóa demo lock nếu có
    if (currentSession.table_id) {
      const match = currentSession.table_id.match(/\d+/);
      if (match) {
        localStorage.removeItem(`omniresto_demo_lock_tbl_${parseInt(match[0], 10)}`);
      }
    }

    const updatedOrders = get().orders.map((o) => ({
      ...o,
      status: 'completed' as const,
      payment_status: 'paid' as const,
    }));

    // Khi thanh toán xong -> Hủy phiên bàn, giải phóng bàn và chuyển về chế độ giao hàng
    saveTableSessionToStorage(null);
    saveOrdersToStorage(updatedOrders);
    set({
      table_session: null,
      order_mode: 'delivery',
      orders: updatedOrders,
    });

    if (typeof window !== 'undefined' && currentSession.table_id) {
      window.dispatchEvent(
        new CustomEvent('omniresto:table_session_closed', {
          detail: { tableId: currentSession.table_id, reason: 'CLIENT_PAYMENT_CONFIRMED' },
        })
      );
    }
    return null;
  },

  // Order
  order_mode: initialSavedTableSession ? 'dine_in' : 'delivery',
  setOrderMode: (mode) => set({ order_mode: mode }),
  set_order_mode: (mode) => set({ order_mode: mode }),
  order_draft: {},
  setOrderDraft: (patch) =>
    set((state) => ({ order_draft: { ...state.order_draft, ...patch } })),
  set_order_draft: (patch) =>
    set((state) => ({ order_draft: { ...state.order_draft, ...patch } })),

  // Orders collection & active order
  orders: initialSavedOrders,
  placed_order: initialSavedOrders.length > 0 ? initialSavedOrders[0] : null,

  setPlacedOrder: (order) => set({ placed_order: order }),
  set_placed_order: (order) => set({ placed_order: order }),
  clearPlacedOrder: () => set({ placed_order: null }),
  clear_placed_order: () => set({ placed_order: null }),

  placeOrder: async (draft) => {
    orderCounter += 1;
    const state = get();

    if (draft.order_mode === 'dine_in' && !state.table_session?.session_token) {
      alert('Chưa có phiên bàn hợp lệ! Quý khách vui lòng quét mã QR tại bàn để gọi món.');
      return null;
    }

    // Chặn đặt món nếu hóa đơn đang đóng băng để thanh toán (chỉ áp dụng khi gọi món ăn tại bàn)
    if (draft.order_mode === 'dine_in' && state.table_session?.status === 'payment_requested') {
      alert('Hóa đơn của bàn đang được đóng băng để thanh toán. Quý khách vui lòng bấm "Hủy yêu cầu thanh toán" trên ứng dụng nếu muốn tiếp tục gọi thêm món tại bàn!');
      return null;
    }

    if (state.cart.length === 0) {
      alert('Giỏ hàng đang trống! Quý khách vui lòng chọn món trước khi gửi đơn.');
      return null;
    }

    // Cart Guard: Kiểm tra toàn bộ món trong giỏ hàng xem có món nào bị quá giờ phục vụ không
    const expiredItems = state.cart.filter((it) => !checkIsItemAvailableNow(it));
    if (expiredItems.length > 0) {
      const names = expiredItems.map((i) => `"${i.name}"`).join(', ');
      alert(`⚠️ Đơn hàng có món đã hết thời gian phục vụ (${names}). Quý khách vui lòng xóa món này khỏi giỏ hàng trước khi gửi đơn nhé!`);
      return null;
    }

    // Cart Guard: Kiểm tra trạng thái món còn hàng / ngừng kinh doanh theo thời gian thực
    const currentMenuItems = useAdminStore.getState().menu_items;
    const unavailableItems = state.cart.filter((it) => {
      const itemId = it.menu_item_id || it.id;
      const found = currentMenuItems.find((m) => m.id === itemId);
      if (found) {
        const s = (found.status || '').toUpperCase();
        return s === 'out_of_stock' || s === 'discontinued';
      }
      return false;
    });
    if (unavailableItems.length > 0) {
      const names = unavailableItems.map((i) => `"${i.name}"`).join(', ');
      alert(`⚠️ Đơn hàng có món hiện đang tạm hết hoặc ngừng phục vụ (${names}). Quý khách vui lòng xóa món này khỏi giỏ hàng trước khi gửi đơn!`);
      return null;
    }

    const session = state.table_session;
    const effectiveTableNo = draft.order_mode === 'dine_in'
      ? session?.table_no
      : (draft.order_mode === 'takeaway' && session ? session?.table_no : draft.table_no);

    const effectiveSessionToken = draft.order_mode === 'dine_in'
      ? session?.session_token
      : undefined;

    if (draft.order_mode === 'dine_in' && !effectiveSessionToken) {
      alert('Chưa có thông tin bàn ăn! Quý khách vui lòng quét mã QR tại bàn trước khi đặt món.');
      return null;
    }

    // Gửi đơn lên Backend Server (Single Source of Truth)
    let serverOrderData: any = null;
    try {
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
      };
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (effectiveSessionToken) {
        headers['X-Table-Session'] = effectiveSessionToken;
      }
      const rawMethod = (draft.payment_method || 'cash').toLowerCase();
      const normalizedPaymentMethod = rawMethod === 'cash' ? 'cash' : rawMethod === 'card' ? 'card' : 'qr_code';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_type: draft.order_mode === 'dine_in' ? 'dine_in' : draft.order_mode === 'takeaway' ? 'takeaway' : 'delivery',
          table_no: effectiveTableNo,
          customer_name: draft.customer_name,
          payment_method: normalizedPaymentMethod,
          voucher_code: draft.voucher_code || undefined,
          items: state.cart.map((it) => ({
            menu_item_id: it.menu_item_id || it.id || '',
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            notes: it.notes,
            option_ids: (it as any).option_ids || [],
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errorMsg = errJson.message || 'Đặt món không thành công. Quý khách vui lòng thử lại!';
        alert(`❌ ${errorMsg}`);
        return null;
      }

      serverOrderData = await res.json();
    } catch (e: any) {
      console.error('Lỗi khi gửi đơn hàng lên máy chủ:', e);
      alert('❌ Không thể kết nối đến máy chủ đặt món. Quý khách vui lòng kiểm tra kết nối mạng và thử lại!');
      return null;
    }

    if (!serverOrderData) {
      return null;
    }

    const existingOrder = state.orders.find((o) => o.id === serverOrderData.id || o.order_number === (serverOrderData.order_number || serverOrderData.orderNumber));
    const finalOrder = mapServerOrderToPlacedOrder(serverOrderData, existingOrder || {
      order_mode: draft.order_mode,
      payment_method: draft.payment_method,
    } as any);

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
      order_number: finalOrder.order_number || finalOrder.id,
      order_type: finalOrder.order_mode,
      table_no: finalOrder.table_no,
      status: finalOrder.status || 'confirmed',
      items: finalOrder.items.map((it, i) => ({
        id: String(i + 1),
        name: `${it.name}${it.round_no && it.round_no > 1 ? ` (Đợt ${it.round_no})` : ''}`,
        quantity: it.quantity,
        price: it.price,
        notes: it.notes,
        options: it.options || [],
      })),
      total_amount: finalOrder.total_amount || 0,
      created_at: 'Vừa xong',
      customer_name: finalOrder.customer_name,
      payment_method: finalOrder.payment_method as any,
    });

    // Chỉ clear giỏ hàng khi backend đã ghi nhận tạo/cộng dồn đơn thành công
    set({
      orders: updatedOrders,
      placed_order: finalOrder,
      cart: [],
      order_draft: {},
    });
    return finalOrder;
  },

  syncOrderStatus: (id, status) =>
    set((state) => {
      const normStatus = (status || 'pending').toLowerCase() as PlacedOrderStatus;
      let changed = false;
      const updatedOrders = state.orders.map((o) => {
        if (o.id === id || o.order_number === id) {
          changed = true;
          return {
            ...o,
            status: normStatus,
            items: o.items.map((it) => ({
              ...it,
              status: (normStatus === 'completed' ? 'ready' : normStatus) as any,
            })),
          };
        }
        return o;
      });
      if (!changed) return state;

      saveOrdersToStorage(updatedOrders);
      const updatedPlaced =
        state.placed_order && (state.placed_order.id === id || state.placed_order.order_number === id)
          ? {
            ...state.placed_order,
            status: normStatus,
            items: state.placed_order.items.map((it) => ({
              ...it,
              status: (normStatus === 'completed' ? 'ready' : normStatus) as any,
            })),
          }
          : state.placed_order;

      return { orders: updatedOrders, placed_order: updatedPlaced };
    }),

  fetchOrderById: async (orderId: string) => {
    if (!orderId) return null;
    try {
      const headers: Record<string, string> = {};
      const targetOrder = get().orders.find((o) => o.id === orderId || o.order_number === orderId) || get().placed_order;
      const sessionToken = get().table_session?.session_token || targetOrder?.session_token;
      if (sessionToken) {
        headers['X-Table-Session'] = sessionToken;
      }
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/orders/${orderId}`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      const existing = get().orders.find((o) => o.id === data.id || o.order_number === data.order_number);
      const updated = mapServerOrderToPlacedOrder(data, existing);

      set((state) => {
        const idx = state.orders.findIndex((o) => o.id === updated.id || o.order_number === updated.order_number);
        const newOrders = [...state.orders];
        if (idx !== -1) {
          newOrders[idx] = updated;
        } else {
          newOrders.unshift(updated);
        }
        saveOrdersToStorage(newOrders);

        const newPlaced = state.placed_order && (state.placed_order.id === updated.id || state.placed_order.order_number === updated.order_number)
          ? updated
          : state.placed_order;

        return { orders: newOrders, placed_order: newPlaced };
      });
      return updated;
    } catch (err) {
      console.warn('Failed to fetch order from server:', err);
      return null;
    }
  },

  fetchOrdersFromServer: async () => {
    const sessionToken = get().table_session?.session_token;
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) headers['X-Table-Session'] = sessionToken;
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/orders', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const currentOrders = get().orders;
      const updatedList = data.map((d: any) => {
        const orderNum = d.order_number || d.orderNumber;
        const existing = currentOrders.find((o) => o.id === d.id || (orderNum && o.order_number === orderNum));
        return mapServerOrderToPlacedOrder(d, existing);
      });

      const serverIds = new Set(updatedList.map((o) => o.id));
      const remaining = currentOrders.filter((o) => !serverIds.has(o.id));
      const finalList = [...updatedList, ...remaining];

      saveOrdersToStorage(finalList);
      set({ orders: finalList });
      return finalList;
    } catch (err) {
      console.warn('Failed to fetch orders from server:', err);
      return [];
    }
  },

  handleServerOrderEvent: (serverOrder: any) => {
    if (!serverOrder?.id) return;
    const currentOrders = get().orders;
    const currentSession = get().table_session;

    const orderSessionId = serverOrder.table_session_id || serverOrder.tableSessionId;
    const orderNumber = serverOrder.order_number || serverOrder.orderNumber;

    // Kiểm tra xem đơn hàng này có thuộc về thiết bị/phiên của khách này không
    const matchesSession = currentSession?.id && orderSessionId === currentSession.id;
    const matchesExisting = currentOrders.some((o) => o.id === serverOrder.id || (orderNumber && o.order_number === orderNumber));

    if (!matchesSession && !matchesExisting) {
      return;
    }

    const existing = currentOrders.find((o) => o.id === serverOrder.id || (orderNumber && o.order_number === orderNumber));
    const updated = mapServerOrderToPlacedOrder(serverOrder, existing);

    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === updated.id || (updated.order_number && o.order_number === updated.order_number));
      const newOrders = [...state.orders];
      if (idx !== -1) {
        newOrders[idx] = updated;
      } else {
        newOrders.unshift(updated);
      }
      saveOrdersToStorage(newOrders);

      const newPlaced = state.placed_order && (state.placed_order.id === updated.id || (updated.order_number && state.placed_order.order_number === updated.order_number))
        ? updated
        : state.placed_order;

      return { orders: newOrders, placed_order: newPlaced };
    });

    // Nếu đơn hàng bị hủy hoặc hoàn tất, refresh lại phiên bàn từ backend để cập nhật tổng tiền
    if (updated.status === 'cancelled' || updated.status === 'completed') {
      if (currentSession?.session_token) {
        get().refreshTableSession();
      }
    }
  },

  // Table service requests (kết nối API backend với rate limiting)
  service_requests: {},
  sendServiceRequest: async (orderId, requestText) => {
    const state = get();
    const currentSession = state.table_session;
    if (!currentSession?.session_token) {
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
          'X-Table-Session': currentSession.session_token,
        },
        body: JSON.stringify({
          request_type: requestType,
          note: requestText,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`⚠️ ${errJson.message || 'Không thể gửi yêu cầu phục vụ lúc này. Quý khách vui lòng thử lại sau giây lát!'}`);
        return;
      }

      const tableNo = currentSession.table_no || state.placed_order?.table_no || 'Bàn';
      const current = state.service_requests[orderId] || [];
      const updated = {
        ...state.service_requests,
        [orderId]: [...current, `${requestText} (${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`],
      };

      try {
        useAdminStore.getState().addServiceRequest({ table_no: tableNo, order_id: orderId, request_text: requestText });
      } catch { }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omniresto:service_request', {
            detail: { tableNo, orderId, requestText },
          })
        );
      }

      set({ service_requests: updated });
      alert(`🔔 Đã gửi yêu cầu: "${requestText}". Nhân viên phục vụ sẽ đến hỗ trợ bàn ${tableNo} ngay!`);
    } catch (e) {
      console.error('Lỗi khi gửi yêu cầu phục vụ:', e);
      alert('❌ Lỗi kết nối khi gửi yêu cầu. Quý khách vui lòng thử lại!');
    }
  },

  // Cart drawer
  is_cart_open: false,
  openCart: () => set({ is_cart_open: true }),
  closeCart: () => set({ is_cart_open: false }),

  // Reset all client data (orders, table session, cart)
  resetClientData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TABLE_SESSION_KEY);
    } catch { }
    set({
      orders: [],
      placed_order: null,
      cart: [],
      table_session: null,
      order_draft: {},
      service_requests: {},
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
    const current = useClientStore.getState().table_session;
    if (current && (!e.detail?.tableNo || (current.table_no && current.table_no.toLowerCase() === e.detail.tableNo.toLowerCase()))) {
      useClientStore.getState().verifySessionDemo();
    }
  }) as EventListener);

  window.addEventListener('omniresto:table_session_closed', ((e: CustomEvent<{ tableId: string; reason: string }>) => {
    const current = useClientStore.getState().table_session;
    if (current && (!e.detail?.tableId || current.table_id === e.detail.tableId)) {
      useClientStore.getState().clearTableSession();
      useClientStore.setState({ order_mode: 'delivery' });
      alert('🔔 Bàn của quý khách đã hoàn tất thanh toán hoặc kết thúc phiên. Cảm ơn quý khách đã dùng bữa tại OmniResto!');
    }
  }) as EventListener);
}
