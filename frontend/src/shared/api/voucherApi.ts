import { apiClient, transformAxiosErrorResponse } from './client';
import type { VoucherInfo, VoucherStatus } from '../types/admin';

export const voucherApi = {
  getVouchers: async (status?: string): Promise<VoucherInfo[]> => {
    try {
      const url = status && status.toUpperCase() !== 'ALL' ? `/vouchers?status=${status.toUpperCase()}` : '/vouchers';
      
      const res = await apiClient.get<any[]>(url);
      
      // Map dữ liệu để xử lý khác biệt giữa snake_case (DB) và camelCase (Frontend)
      return res.data.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        discountType: v.discountType || v.discount_type || 'FIXED_AMOUNT',
        discountValue: Number(v.discountValue || v.discount_value || 0),
        maxDiscountAmount: v.maxDiscountAmount || v.max_discount_amount ? Number(v.maxDiscountAmount || v.max_discount_amount) : undefined,
        minOrderAmount: Number(v.minOrderAmount || v.min_order_amount || 0),
        totalQuantity: Number(v.totalQuantity || v.total_quantity || 0),
        usedQuantity: Number(v.usedQuantity || v.used_quantity || 0),
        usageLimitPerUser: Number(v.usageLimitPerUser || v.usage_limit_per_user || 1),
        startDate: v.startDate || v.start_date,
        endDate: v.endDate || v.end_date,
        status: (v.status?.toUpperCase() || 'INACTIVE') as VoucherStatus,
        isWelcomeVoucher: Boolean(v.isWelcomeVoucher || v.is_welcome_voucher),
        createdAt: v.createdAt || v.created_at,
      }));
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateStatus: async (voucherId: string, status: VoucherStatus): Promise<void> => {
    try {
      // Truyền qua query params
      await apiClient.patch(`/vouchers/${voucherId}/status?status=${status.toUpperCase()}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createVoucher: async (voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.post<VoucherInfo>('/vouchers', voucherData);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // Cập nhật thông tin voucher theo ID
  updateVoucher: async (id: string, voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.put<VoucherInfo>(`/vouchers/${id}`, voucherData);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  validateVoucher: async (code: string, orderAmount: number): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.get<any>(`/vouchers/validate?code=${code}&orderAmount=${orderAmount}`);
      const v = res.data;
      
      // Map lại giống hệt hàm getVouchers
      return {
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        discountType: v.discountType || v.discount_type,
        discountValue: Number(v.discountValue || v.discount_value || 0),
        maxDiscountAmount: v.maxDiscountAmount || v.max_discount_amount ? Number(v.maxDiscountAmount || v.max_discount_amount) : undefined,
        minOrderAmount: Number(v.minOrderAmount || v.min_order_amount || 0),
        totalQuantity: Number(v.totalQuantity || v.total_quantity || 0),
        usedQuantity: Number(v.usedQuantity || v.used_quantity || 0),
        usageLimitPerUser: Number(v.usageLimitPerUser || v.usage_limit_per_user || 1),
        startDate: v.startDate || v.start_date,
        endDate: v.endDate || v.end_date,
        status: (v.status?.toUpperCase() || 'INACTIVE') as VoucherStatus,
        isWelcomeVoucher: Boolean(v.isWelcomeVoucher || v.is_welcome_voucher),
        createdAt: v.createdAt || v.created_at,
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  }
};