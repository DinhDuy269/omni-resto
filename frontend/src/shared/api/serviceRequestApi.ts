import { apiClient, transformAxiosErrorResponse } from './client';
import type { ServiceRequestItem } from '../../admin/store/adminStore';

export type { ServiceRequestItem };

export const serviceRequestApi = {
  // Lấy toàn bộ yêu cầu phục vụ đang chờ xử lý từ backend
  getActiveRequests: async (): Promise<ServiceRequestItem[]> => {
    try {
      const res = await apiClient.get<any[]>('/service-requests/active');
      return (res.data || []).map((item) => ({
        id: item.id,
        table_session_id: item.table_session_id,
        table_id: item.table_id,
        table_no: item.table_no,
        request_type: item.request_type,
        note: item.note,
        request_text: item.note || item.request_type || 'Yêu cầu phục vụ',
        status: (item.status || 'pending').toUpperCase() === 'PENDING' ? 'OPEN' : 'RESOLVED',
        created_at: item.created_at,
        timestamp: item.created_at ? new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      }));
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // Đánh dấu yêu cầu đã được nhân viên phục vụ xử lý
  resolveRequest: async (id: string, staffId: string = 'STAFF-POS'): Promise<void> => {
    try {
      await apiClient.post(`/service-requests/${id}/resolve?staffId=${encodeURIComponent(staffId)}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  // Đánh dấu tất cả yêu cầu của một bàn đã xử lý xong
  resolveTableRequests: async (tableNo: string, staffId: string = 'STAFF-POS'): Promise<void> => {
    try {
      await apiClient.post(`/service-requests/resolve-table?tableNo=${encodeURIComponent(tableNo)}&staffId=${encodeURIComponent(staffId)}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
