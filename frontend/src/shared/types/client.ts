import type { MenuCategory } from './menu';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export type OrderItemLineStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface CartItem {
  id?: string;
  menuItemId: string;
  name: string;
  category: MenuCategory;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  roundNo?: number;
  status?: OrderItemLineStatus;
  addedAt?: string;
}

export interface VietQRInfo {
  qrImageUrl: string;
  amount: number;
  bankId: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
}

export interface TableSession {
  id: string;
  tableId: string;
  tableNo: string;
  sessionToken: string;
  status: 'ACTIVE' | 'PAYMENT_REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED' | 'EXPIRED';
  mode: 'PAY_AFTER' | 'PAY_FIRST';
  expiresAt: string;
  isVerified?: boolean;
  verifiedAt?: string;
  verifiedByStaffId?: string;
  message?: string;
  activeOrderId?: string;
  activeOrderNumber?: string;
  totalAmount?: number;
  paymentStatus?: PaymentStatusType;
  vietQr?: VietQRInfo;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type ClientPaymentMethod = 'CASH' | 'CARD' | 'QR_CODE';

export interface ClientOrderDraft {
  orderMode: OrderMode;
  tableNo?: string;
  sessionToken?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMethod: ClientPaymentMethod;
}

export type PlacedOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatusType = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  tableSessionId?: string;
  orderMode: OrderMode;
  tableNo?: string;
  sessionToken?: string;
  customerName?: string;
  items: CartItem[];
  totalAmount: number;
  status: PlacedOrderStatus;
  paymentStatus?: PaymentStatusType;
  placedAt: string;
  estimatedMinutes: number;
  paymentMethod: ClientPaymentMethod;
}
