export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItemInfo {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableNo?: string;
  status: OrderStatus;
  items: OrderItemInfo[];
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  paymentMethod: 'cash' | 'card' | 'qr_code' | 'CASH' | 'CARD' | 'QR_CODE';
}

export interface OrderRequest {
  orderType: OrderType;
  tableNo?: string;
  items: OrderItemInfo[];
  customerName?: string;
  paymentMethod?: string;
}

export interface OrderResponse {
  order?: Order;
  orders?: Order[];
}
