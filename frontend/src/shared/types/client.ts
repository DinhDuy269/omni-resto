import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: string;
  name: string;
  category: MenuCategory;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type ClientPaymentMethod = 'CASH' | 'CARD' | 'QR_CODE';

export interface ClientOrderDraft {
  orderMode: OrderMode;
  tableNo?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMethod: ClientPaymentMethod;
}

export type PlacedOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  orderMode: OrderMode;
  tableNo?: string;
  customerName?: string;
  items: CartItem[];
  totalAmount: number;
  status: PlacedOrderStatus;
  placedAt: string;
  estimatedMinutes: number;
  paymentMethod: ClientPaymentMethod;
}
