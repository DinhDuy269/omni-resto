// api/voucherApi.ts

import { apiClient, transformAxiosErrorResponse, toQueryString } from '../../../shared/api/client';
import type { VoucherInfo } from '../../../shared/types';

export const voucherApi = {
  getVouchers: async (status?: string): Promise<VoucherInfo[]> => {
    try {
      // Nếu status là ALL thì không truyền param status lên server
      const q = toQueryString({ status: status === 'ALL' ? undefined : status });
      const res = await apiClient.get<VoucherInfo[]>(`/vouchers${q}`);
      return res.data;
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

  // Dùng cho client áp mã ở giỏ hàng
  validateVoucher: async (code: string, orderAmount: number): Promise<VoucherInfo> => {
    try {
      const res = await apiClient.get<VoucherInfo>(`/vouchers/validate?code=${code}&orderAmount=${orderAmount}`);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  }
};