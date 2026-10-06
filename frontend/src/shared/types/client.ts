import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type OrderItemLineStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface CartItem {
  id?: string;
  menu_item_id: string;
  name: string;
  category: MenuCategory;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  roung_no?: number;
  status?: OrderItemLineStatus;
  added_at?: string;
}

export interface VietQRInfo {
  qr_image_url: string;
  amount: number;
  bank_id: string;
  account_number: string;
  account_name: string;
  transfer_content: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  table_no: string;
  session_token: string;
  status: 'ACTIVE' | 'PAYMENT_REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED' | 'EXPIRED'
    | 'active' | 'payment_requested' | 'payment_pending' | 'paid' | 'closed' | 'expired';
  mode: 'PAY_AFTER' | 'PAY_FIRST' | 'pay_after' | 'pay_first';
  expires_at: string;
  is_verified?: boolean;
  verified_at?: string;
  verified_by_staff_id?: string;
  message?: string;
  active_order_id?: string;
  active_order_number?: string;
  total_amount?: number;
  payment_status?: PaymentStatusType;
  viet_qr?: VietQRInfo;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type ClientPaymentMethod = 'CASH' | 'CARD' | 'QR_CODE';

export interface ClientOrderDraft {
  order_mode: OrderMode;
  table_no?: string;
  session_token?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  notes?: string;
  payment_method: ClientPaymentMethod;
}

export type PlacedOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatusType = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface PlacedOrder {
  id: string;
  order_number: string;
  table_session_id?: string;
  order_mode: OrderMode;
  table_no?: string;
  session_token?: string;
  customer_name?: string;
  items: CartItem[];
  total_amount: number;
  status: PlacedOrderStatus;
  payment_status?: PaymentStatusType;
  placed_at: string;
  estimated_minutes: number;
  payment_method: ClientPaymentMethod;
}
