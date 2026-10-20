export type VoucherStatus = 'active' | 'inactive' | 'expired' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export type DiscountType = 'percentage' | 'fixed_amount' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface VoucherInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount: number;
  total_quantity: number;
  used_quantity: number;
  usage_limit_per_user: number;
  start_date: string; // Chuỗi ISO 8601 (VD: '2026-09-30T00:00:00')
  end_date: string;
  status: VoucherStatus;
  is_welcome_voucher: boolean;
  created_at: string;
}

export interface VoucherRequest {
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  total_quantity: number;
  usage_limit_per_user?: number;
  start_date: string;
  end_date: string;
  is_welcome_voucher?: boolean;
}

export interface VoucherResponse {
  voucher?: VoucherInfo;
  vouchers?: VoucherInfo[];
}