import { apiClient, transformAxiosErrorResponse } from './client';
import type { VoucherInfo, VoucherStatus } from '../types';

/**
 * Hàm chuẩn hóa DTO Voucher từ Backend (hỗ trợ cả camelCase và snake_case)
 */
function normalizeVoucherResponse(v: any): VoucherInfo {
  return {
    id: v.id,
    code: v.code || '',
    name: v.name || '',
    description: v.description || '',
    discountType: (v.discountType || v.discount_type || 'FIXED_AMOUNT').toUpperCase(),
    discountValue: Number(v.discountValue ?? v.discount_value ?? 0),
    maxDiscountAmount: v.maxDiscountAmount != null || v.max_discount_amount != null
      ? Number(v.maxDiscountAmount ?? v.max_discount_amount)
      : undefined,
    minOrderAmount: Number(v.minOrderAmount ?? v.min_order_amount ?? 0),
    totalQuantity: Number(v.totalQuantity ?? v.total_quantity ?? 0),
    usedQuantity: Number(v.usedQuantity ?? v.used_quantity ?? 0),
    usageLimitPerUser: Number(v.usageLimitPerUser ?? v.usage_limit_per_user ?? 1),
    startDate: v.startDate || v.start_date || '',
    endDate: v.endDate || v.end_date || '',
    status: (v.status ? v.status.toUpperCase() : 'INACTIVE') as VoucherStatus,
    isWelcomeVoucher: Boolean(v.isWelcomeVoucher ?? v.is_welcome_voucher),
    createdAt: v.createdAt || v.created_at || new Date().toISOString(),
  };
}

export const voucherApi = {
  /**
   * Lấy danh sách voucher cho Admin (hỗ trợ lọc status: ACTIVE, INACTIVE, EXPIRED, ALL)
   */
  getVouchers: async (status?: string): Promise<VoucherInfo[]> => {
    try {
      const url = status && status.toUpperCase() !== 'ALL'
        ? `/vouchers?status=${encodeURIComponent(status.toUpperCase())}`
        : '/vouchers';
      const res = await apiClient.get<any[]>(url);
      return (res.data || []).map(normalizeVoucherResponse);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Lấy danh sách voucher đang có hiệu lực cho Client hiển thị
   */
  getAvailableVouchers: async (): Promise<VoucherInfo[]> => {
    try {
      const res = await apiClient.get<any[]>('/vouchers/available');
      return (res.data || []).map(normalizeVoucherResponse);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Lấy chi tiết voucher theo ID
   */
  getVoucherById: async (id: string): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.get<any>(`/vouchers/${id}`);
      return normalizeVoucherResponse(res.data);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Tạo mới voucher khuyến mãi (Admin)
   */
  createVoucher: async (voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.post<any>('/vouchers', voucherData);
      return normalizeVoucherResponse(res.data);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Cập nhật thông tin voucher theo ID (Admin)
   */
  updateVoucher: async (id: string, voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.put<any>(`/vouchers/${id}`, voucherData);
      return normalizeVoucherResponse(res.data);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Bật/Tắt trạng thái hoạt động của Voucher (Admin)
   */
  updateStatus: async (voucherId: string, status: VoucherStatus): Promise<void> => {
    try {
      await apiClient.patch(`/vouchers/${voucherId}/status?status=${encodeURIComponent(status.toUpperCase())}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Xóa hoặc vô hiệu hóa voucher (Admin)
   */
  deleteVoucher: async (voucherId: string): Promise<void> => {
    try {
      await apiClient.delete(`/vouchers/${voucherId}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Kiểm tra và áp dụng mã voucher cho đơn hàng (Client)
   */
  validateVoucher: async (code: string, orderAmount: number): Promise<VoucherInfo> => {
    try {
      const cleanCode = encodeURIComponent(code.trim().toUpperCase());
      const res = await apiClient.get<any>(`/vouchers/validate?code=${cleanCode}&orderAmount=${orderAmount}`);
      return normalizeVoucherResponse(res.data);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
