export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface TableInfo {
  id: string;
  table_no: string;
  capacity: number;
  status: TableStatus;
  current_order_amount?: number;
  occupied_since?: string;
  qr_secret_token?: string;
  is_verified?: boolean;
  payment_requested?: boolean;
  is_paid?: boolean;
  active_order_number?: string;
  active_session_token?: string;
}

export interface TableRequest {
  table_no: string;
  capacity: number;
}

export interface TableResponse {
  table?: TableInfo;
  tables?: TableInfo[];
}
