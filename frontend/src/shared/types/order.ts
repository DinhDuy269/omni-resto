export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItemOptionInfo {
  id?: string;
  option_id?: string;
  option_name?: string;
  option_type?: string;
  price?: number;
}

export interface OrderItemInfo {
  id: string;
  menu_item_id?: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  status?: string;
  round_no?: number;
  options?: OrderItemOptionInfo[];
}

export interface Order {
  id: string;
  order_number: string;
  order_type?: OrderType;
  table_no?: string;
  table_session_id?: string;
  subtotal?: number;
  discount_amount?: number;
  voucher_id?: string;
  voucher_code?: string;
  customer_id?: string;
  status: OrderStatus;
  items: OrderItemInfo[];
  total_amount: number;
  created_at?: string;
  customer_name?: string;
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  payment_method?: 'cash' | 'card' | 'qr_code' | 'vnpay';
}

export interface OrderRequest {
  order_type?: OrderType;
  table_no?: string;
  table_session_id?: string;
  subtotal?: number;
  discount_amount?: number;
  voucher_id?: string;
  voucher_code?: string;
  customer_id?: string;
  items: OrderItemInfo[];
  customer_name?: string;
  payment_method?: string;
}

export interface OrderResponse {
  order?: Order;
  orders?: Order[];
}
