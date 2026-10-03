// shared/types/admin.ts (Thêm vào cùng file chứa TableStatus)

export type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

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
  startDate: string;
  endDate: string;
  status: VoucherStatus;
  isWelcomeVoucher: boolean;
  createdAt: string;
}

export interface VoucherFilterParams {
  status?: VoucherStatus | 'ALL';
  searchQuery?: string;
}