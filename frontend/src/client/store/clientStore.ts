import { create } from 'zustand';
import type { CartItem, OrderMode, ClientOrderDraft, PlacedOrder } from '../../shared/types/client';
import { useAdminStore } from '../../admin/store/adminStore';

// ─── State Interface ──────────────────────────────────────────────────────────

interface ClientState {
  // Cart management
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;

  // Order mode & draft
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  orderDraft: Partial<ClientOrderDraft>;
  setOrderDraft: (patch: Partial<ClientOrderDraft>) => void;

  // Placed order (result after checkout)
  placedOrder: PlacedOrder | null;
  placeOrder: (draft: ClientOrderDraft) => PlacedOrder;
  clearPlacedOrder: () => void;

  // Cart drawer open/close
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

// ─── Selectors (used with useClientStore(selector)) ───────────────────────────

export const selectTotalItems = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotalAmount = (s: ClientState) =>
  s.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ─── Store ────────────────────────────────────────────────────────────────────

let orderCounter = 8000;

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

  // Order
  orderMode: 'DINE_IN',
  setOrderMode: (mode) => set({ orderMode: mode }),
  orderDraft: {},
  setOrderDraft: (patch) =>
    set((state) => ({ orderDraft: { ...state.orderDraft, ...patch } })),

  // Place order
  placedOrder: null,
  placeOrder: (draft) => {
    orderCounter += 1;
    const state = get();
    const order: PlacedOrder = {
      id: `client-${Date.now()}`,
      orderNumber: `ORD-${orderCounter}`,
      orderMode: draft.orderMode,
      tableNo: draft.tableNo,
      customerName: draft.customerName,
      items: [...state.cart],
      totalAmount: state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: 'PENDING',
      placedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      estimatedMinutes: draft.orderMode === 'DELIVERY' ? 35 : draft.orderMode === 'TAKEAWAY' ? 20 : 15,
      paymentMethod: draft.paymentMethod,
    };

    // Synchronize to Admin Store and update Table state automatically
    useAdminStore.getState().addOrderFromClient({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderMode,
      tableNo: order.tableNo,
      status: 'PENDING',
      items: order.items.map((it, i) => ({
        id: String(i + 1),
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        notes: it.notes,
      })),
      totalAmount: order.totalAmount,
      createdAt: 'Vừa xong',
      customerName: order.customerName,
      paymentMethod: order.paymentMethod as any,
    });

    set({ placedOrder: order, cart: [], orderDraft: {} });
    return order;
  },
  clearPlacedOrder: () => set({ placedOrder: null }),

  // Cart drawer
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
}));
