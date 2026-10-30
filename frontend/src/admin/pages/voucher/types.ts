export type VoucherStatus = 'active' | 'inactive' | 'expired';
export type DiscountType = 'percentage' | 'fixed_amount';

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
  start_date: string;
  end_date: string;
  status: VoucherStatus;
  is_welcome_voucher: boolean;
  created_at: string;
}

export interface VoucherFilterParams {
  status?: VoucherStatus | 'all';
  searchQuery?: string;
}
