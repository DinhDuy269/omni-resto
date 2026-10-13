import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type OrderItemLineStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

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
  roundNo?: number;
  roung_no?: number;
  status?: OrderItemLineStatus;
  added_at?: string;
  addedAt?: string;
}

export interface VietQRInfo {
  qr_image_url?: string;
  qrImageUrl?: string;
  amount: number;
  bank_id?: string;
  bankId?: string;
  account_number?: string;
  accountNumber?: string;
  account_name?: string;
  accountName?: string;
  transfer_content?: string;
  transferContent?: string;
}

export interface TableSession {
  id: string;
  table_id?: string;
  tableId?: string;
  table_no?: string;
  tableNo?: string;
  session_token?: string;
  sessionToken?: string;
  device_token?: string;
  deviceToken?: string;
  is_device_master?: boolean;
  isDeviceMaster?: boolean;
  status: 'ACTIVE' | 'PAYMENT_REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED' | 'EXPIRED'
    | 'active' | 'payment_requested' | 'payment_pending' | 'paid' | 'closed' | 'expired';
  mode: 'PAY_AFTER' | 'PAY_FIRST' | 'pay_after' | 'pay_first';
  expires_at?: string;
  expiresAt?: string;
  is_verified?: boolean;
  isVerified?: boolean;
  verified_at?: string;
  verifiedAt?: string;
  verified_by_staff_id?: string;
  verifiedByStaffId?: string;
  message?: string;
  active_order_id?: string;
  activeOrderId?: string;
  active_order_number?: string;
  activeOrderNumber?: string;
  total_amount?: number;
  totalAmount?: number;
  payment_status?: PaymentStatusType;
  paymentStatus?: PaymentStatusType;
  viet_qr?: VietQRInfo;
  vietQr?: VietQRInfo;
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
}

export type PlacedOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatusType = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface PlacedOrder {
  id: string;
  order_number?: string;
  orderNumber?: string;
  table_session_id?: string;
  tableSessionId?: string;
  order_mode?: OrderMode;
  orderMode?: OrderMode;
  table_no?: string;
  tableNo?: string;
  session_token?: string;
  sessionToken?: string;
  customer_name?: string;
  customerName?: string;
  items: CartItem[];
  total_amount?: number;
  totalAmount?: number;
  status: PlacedOrderStatus;
  payment_status?: PaymentStatusType;
  paymentStatus?: PaymentStatusType;
  placed_at?: string;
  placedAt?: string;
  estimated_minutes?: number;
  estimatedMinutes?: number;
  payment_method?: ClientPaymentMethod;
  paymentMethod?: ClientPaymentMethod;
}
