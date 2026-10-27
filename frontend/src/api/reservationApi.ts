import { apiClient, transformAxiosErrorResponse } from '../shared/api/client';
import type { ApiResponse } from '../shared/types/common';

export type OperatingShiftType = 'MORNING' | 'NOON' | 'BREAK' | 'EVENING' | 'CLOSED';

export interface TableItem {
  id: string;
  table_no: string;
  capacity: number;
  status: string;
}

export interface ReservationItem {
  id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  party_size: number;
  reservation_time: string;
  status: string;
  table_id?: string | null;
  table_no?: string | null;
  table_capacity?: number | null;
  special_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  shift?: string;
  shift_name?: string;
}

export interface OnlineReservationPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  party_size: number;
  reservation_time: string;
  table_id?: string | null;
  special_notes?: string;
}

export interface OfflineReservationPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_time: string;
  table_id?: string;
  table_ids?: string[];
  special_notes?: string;
  seated_immediately?: boolean;
}

export interface SpringPage<T> {
  content: T[];
  total_pages: number;
  total_elements: number;
  size: number;
  number: number;
  number_of_elements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ReservationPagedParams {
  page?: number;
  size?: number;
  status?: string;
  shift?: string;
  search?: string;
  date?: string;
}

export const reservationApi = {
  // 1. Kiểm tra SĐT có đơn đặt bàn đang chờ phục vụ hay không (Chống spam real-time)
  checkActivePhone: async (phone: string): Promise<boolean> => {
    try {
      const res = await apiClient.get<ApiResponse<boolean>>('/tables/reservations/check-phone', {
        params: { phone: phone.trim() },
      });
      return res.data?.data === true;
    } catch {
      return false;
    }
  },

  // 2. Khách đặt bàn trực tuyến (Online)
  createOnline: async (payload: OnlineReservationPayload): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.post<ApiResponse<ReservationItem>>('/tables/reservations/online', payload);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 3. Lấy toàn bộ danh sách đơn đặt bàn
  getAll: async (status?: string): Promise<ApiResponse<ReservationItem[]>> => {
    try {
      const res = await apiClient.get<ApiResponse<ReservationItem[]>>('/tables/reservations', {
        params: status && status !== 'ALL' && status.trim() !== '' ? { status } : undefined,
      });
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 4. Lấy danh sách toàn bộ bàn ăn
  getTables: async (): Promise<ApiResponse<TableItem[]>> => {
    try {
      const res = await apiClient.get<ApiResponse<TableItem[]>>('/tables/reservations/tables');
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 5. Tạo đơn đặt bàn Hotline / Đoàn đông (Offline)
  createOffline: async (payload: OfflineReservationPayload): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.post<ApiResponse<ReservationItem>>('/tables/reservations/offline', payload);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 6. Xếp bàn
  assignTable: async (id: string, tableIds: string[]): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.put<ApiResponse<ReservationItem>>(
        `/tables/reservations/${id}/assign-table`,
        { tableIds }
      );
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 7. Nhận bàn (Check-in SEATED)
  checkIn: async (id: string): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.put<ApiResponse<ReservationItem>>(`/tables/reservations/${id}/check-in`);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 8. Hủy đơn đặt bàn
  cancel: async (id: string, reason?: string): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.put<ApiResponse<ReservationItem>>(`/tables/reservations/${id}/cancel`, null, {
        params: reason ? { reason } : undefined,
      });
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 9. Tra cứu theo mã đơn
  getByCode: async (code: string): Promise<ApiResponse<ReservationItem>> => {
    try {
      const res = await apiClient.get<ApiResponse<ReservationItem>>(`/tables/reservations/track/${code}`);
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // 10. Phân trang & lọc ca cho Admin
  getPaged: async (params: ReservationPagedParams): Promise<ApiResponse<SpringPage<ReservationItem>>> => {
    try {
      const queryParams: Record<string, string | number> = {
        page: params.page ?? 0,
        size: params.size ?? 10,
      };

      if (params.status && params.status !== 'ALL') queryParams.status = params.status;
      if (params.shift && params.shift !== 'ALL') queryParams.shift = params.shift;
      if (params.search && params.search.trim() !== '') queryParams.search = params.search.trim();
      if (params.date) queryParams.date = params.date;

      const res = await apiClient.get<ApiResponse<SpringPage<ReservationItem>>>(
        '/tables/reservations/paged',
        { params: queryParams }
      );
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};

export default reservationApi;
