import { apiClient, transformAxiosErrorResponse } from './client';
import type { TableInfo, TableStatus } from '../types/admin';

export const tableApi = {
  getAll: async (): Promise<TableInfo[]> => {
    try {
      const res = await apiClient.get<any[]>('/tables');

      return res.data.map((t) => ({
        id: t.id,
        table_no: t.table_no || '',
        capacity: t.capacity || 4,
        status: (t.status?.toUpperCase() || 'AVAILABLE') as TableStatus,
        qr_secret_token: t.qr_secret_token || '',
        current_order_amount: t.current_order_amount,
        occupied_since: t.occupied_since,
      }));
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateStatus: async (id: string, status: TableStatus): Promise<void> => {
    try {
      await apiClient.patch(`/tables/${id}/status?status=${status.toLowerCase()}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

    regenerateQr: async (id: string): Promise<string> => {
        try {
            const res = await apiClient.post<any>(`/tables/${id}/regenerate-qr`);
            return res.data.qr_secret_token || '';
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },
};