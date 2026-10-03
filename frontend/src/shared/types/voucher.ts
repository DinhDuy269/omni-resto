export type VoucherStatus = 'active' | 'inactive' | 'expired' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export type DiscountType = 'percentage' | 'fixed_amount' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface VoucherInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  totalQuantity: number;
  usedQuantity: number;
  usageLimitPerUser: number;
  startDate: string; // Chuỗi ISO 8601 (VD: '2026-09-30T00:00:00')
  endDate: string;
  status: VoucherStatus;
  isWelcomeVoucher: boolean;
  createdAt: string;
}

export interface VoucherRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  totalQuantity: number;
  usageLimitPerUser?: number;
  startDate: string;
  endDate: string;
  isWelcomeVoucher?: boolean;
}

export interface VoucherResponse {
  voucher?: VoucherInfo;
  vouchers?: VoucherInfo[];
}