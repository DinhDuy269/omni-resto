export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItemOptionInfo {
  id?: string;
  option_id?: string;
  option_name?: string;
  optionId?: string;
  optionName?: string;
  option_type?: string;
  optionType?: string;
  price?: number;
}

export interface OrderItemInfo {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  status?: string;
  options?: OrderItemOptionInfo[];
}

export interface Order {
  id: string;
  order_number: string;
  order_type?: OrderType;
  table_no?: string;
  status: OrderStatus;
  items: OrderItemInfo[];
  total_amount: number;
  created_at?: string;
  customer_name?: string;
  payment_status?: string;
  payment_method?: 'cash' | 'card' | 'qr_code' | 'CASH' | 'CARD' | 'QR_CODE';
}

export interface OrderRequest {
  order_type?: OrderType;
  table_no?: string;
  items: OrderItemInfo[];
  customer_name?: string;
  payment_method?: string;
}

export interface OrderResponse {
  order?: Order;
  orders?: Order[];
}
