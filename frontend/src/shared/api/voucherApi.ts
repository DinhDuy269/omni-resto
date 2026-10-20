import { apiClient, transformAxiosErrorResponse } from './client';
import type { VoucherInfo, VoucherStatus } from '../types';

export const voucherApi = {
  /**
   * Lấy danh sách voucher cho Admin (hỗ trợ lọc status: ACTIVE, INACTIVE, EXPIRED, ALL)
   */
  getVouchers: async (status?: string): Promise<VoucherInfo[]> => {
    try {
      const url = status && status.toUpperCase() !== 'ALL'
        ? `/vouchers?status=${encodeURIComponent(status.toUpperCase())}`
        : '/vouchers';
      const res = await apiClient.get<VoucherInfo[]>(url);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Lấy danh sách voucher đang có hiệu lực cho Client hiển thị
   */
  getAvailableVouchers: async (): Promise<VoucherInfo[]> => {
    try {
      const res = await apiClient.get<VoucherInfo[]>('/vouchers/available');
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Lấy chi tiết voucher theo ID
   */
  getVoucherById: async (id: string): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.get<VoucherInfo>(`/vouchers/${id}`);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Tạo mới voucher khuyến mãi (Admin)
   */
  createVoucher: async (voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.post<VoucherInfo>('/vouchers', voucherData);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Cập nhật thông tin voucher theo ID (Admin)
   */
  updateVoucher: async (id: string, voucherData: Partial<VoucherInfo>): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.put<VoucherInfo>(`/vouchers/${id}`, voucherData);
      return res.data;
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
      const res = await apiClient.get<VoucherInfo>(`/vouchers/validate?code=${cleanCode}&orderAmount=${orderAmount}`);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
