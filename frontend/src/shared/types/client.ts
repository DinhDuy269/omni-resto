import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type OrderItemLineStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface CartItemOption {
  id?: string;
  option_id?: string;
  option_name?: string;
  option_type?: string;
  price?: number;
}

export interface CartItem {
  id?: string;
  menu_item_id?: string;
  name: string;
  category: MenuCategory | string;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  round_no?: number;
  status?: OrderItemLineStatus;
  added_at?: string;
  option_ids?: string[];
  options?: CartItemOption[];
  is_available_now?: boolean;
  meal_periods?: string;
}


export interface TableSession {
  id: string;
  table_id?: string;
  table_no?: string;
  session_token?: string;
  device_token?: string;
  is_device_master?: boolean;
  status: 'active' | 'payment_requested' | 'payment_pending' | 'paid' | 'closed' | 'expired';
  mode: 'pay_after' | 'pay_first';
  expires_at?: string;
  is_verified?: boolean;
  verified_at?: string;
  verified_by_staff_id?: string;
  message?: string;
  active_order_id?: string;
  active_order_number?: string;
  total_amount?: number;
  payment_status?: PaymentStatusType;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderMode = 'dine_in' | 'takeaway' | 'delivery';
export type ClientPaymentMethod = 'cash' | 'card' | 'qr_code' | 'vnpay' | 'vnpay_qr';

export interface VnPayPaymentInfo {
  order_id: string;
  order_number: string;
  amount: number;
  payment_url: string;
  qr_image_url: string;
  txn_ref: string;
  bank_code?: string;
  message?: string;
}

export interface VnPayCallbackResult {
  is_success: boolean;
  order_id?: string;
  order_number?: string;
  amount?: number;
  transaction_no?: string;
  txn_ref?: string;
  response_code?: string;
  message?: string;
}

export interface VnPayProcessPaymentRequest {
  order_id: string;
  card_number: string;
  card_holder: string;
  payment_date: string;
  otp: string;
}

export const VNPAY_SANDBOX_CONFIG = {
  bank_name: 'NCB',
  card_number: '9704198526191432198',
  card_holder: 'NGUYEN VAN A',
  payment_date: '07/15',
  otp: '123456',
};

export interface ClientOrderDraft {
  order_mode?: OrderMode;
  table_no?: string;
  session_token?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  notes?: string;
  payment_method?: ClientPaymentMethod;
  voucher_code?: string;
}

export type PlacedOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatusType = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export interface PlacedOrder {
  id: string;
  order_number: string;
  table_session_id?: string;
  order_mode?: OrderMode;
  table_no?: string;
  session_token?: string;
  customer_name?: string;
  items: CartItem[];
  total_amount: number;
  status: PlacedOrderStatus;
  payment_status?: PaymentStatusType;
  placed_at?: string;
  estimated_minutes?: number;
  payment_method?: ClientPaymentMethod;
}
