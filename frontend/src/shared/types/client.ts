import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type OrderItemLineStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface CartItemOption {
  id?: string;
  option_id?: string;
  option_name?: string;
  optionId?: string;
  optionName?: string;
  option_type?: string;
  optionType?: string;
  price?: number;
}

export interface CartItem {
  id?: string;
  menu_item_id?: string;
  menuItemId?: string;
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
  availableNow?: boolean;
  meal_periods?: string;
  mealPeriods?: string;
}


export interface VietQRInfo {
  qr_image_url?: string;
  amount: number;
  bank_id?: string;
  account_number?: string;
  account_name?: string;
  transfer_content?: string;
}

export interface TableSession {
  id: string;
  table_id?: string;
  table_no?: string;
  tableNo?: string;
  session_token?: string;
  sessionToken?: string;
  device_token?: string;
  is_device_master?: boolean;
  status: 'ACTIVE' | 'PAYMENT_REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED' | 'EXPIRED'
  | 'active' | 'payment_requested' | 'payment_pending' | 'paid' | 'closed' | 'expired';
  mode: 'PAY_AFTER' | 'PAY_FIRST' | 'pay_after' | 'pay_first';
  expires_at?: string;
  is_verified?: boolean;
  isVerified?: boolean;
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
export type ClientPaymentMethod = 'CASH' | 'CARD' | 'QR_CODE' | 'VNPAY_QR' | 'vnpay_qr' | 'cash' | 'card' | 'qr_code';

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
  orderMode?: OrderMode;
  table_no?: string;
  tableNo?: string;
  session_token?: string;
  sessionToken?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  delivery_address?: string;
  deliveryAddress?: string;
  notes?: string;
  payment_method?: ClientPaymentMethod;
  paymentMethod?: ClientPaymentMethod;
  voucher_code?: string;
  voucherCode?: string;
}

export type PlacedOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatusType = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

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
