import { apiClient, transformAxiosErrorResponse } from './client';
import type { TableInfo, TableStatus } from '../types/admin';

export const tableApi = {
  getAll: async (): Promise<TableInfo[]> => {
    try {
      const res = await apiClient.get<any[]>('/tables');

      return res.data.map((t) => ({
        id: t.id,
        table_no: t.table_no || t.tableNo || '',
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

  create: async (data: { table_no: string; capacity?: number }): Promise<TableInfo> => {
    try {
      const res = await apiClient.post<any>('/tables', {
        table_no: data.table_no,
        capacity: data.capacity,
      });
      const t = res.data;
      return {
        id: t.id,
        table_no: t.table_no || '',
        capacity: t.capacity || 4,
        status: (t.status?.toUpperCase() || 'AVAILABLE') as TableStatus,
        qr_secret_token: t.qr_secret_token || '',
        current_order_amount: t.current_order_amount,
        occupied_since: t.occupied_since,
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  update: async (id: string, data: { table_no: string; capacity?: number }): Promise<TableInfo> => {
    try {
      const res = await apiClient.put<any>(`/tables/${id}`, {
        table_no: data.table_no,
        capacity: data.capacity,
      });
      const t = res.data;
      return {
        id: t.id,
        table_no: t.table_no || t.tableNo || '',
        capacity: t.capacity || 4,
        status: (t.status?.toUpperCase() || 'AVAILABLE') as TableStatus,
        qr_secret_token: t.qr_secret_token || t.qrSecretToken || '',
        current_order_amount: t.current_order_amount ?? t.currentOrderAmount ?? 0,
        occupied_since: t.occupied_since || t.occupiedSince || '',
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/tables/${id}`);
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

  closeSession: async (tableId: string, reason: string = 'MANUAL_CLOSE'): Promise<void> => {
    try {
      await apiClient.post(`/table-sessions/close?tableId=${encodeURIComponent(tableId)}&reason=${encodeURIComponent(reason)}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  confirmPayment: async (
    tableId: string,
    options?: { staffId?: string; method?: string; amountReceived?: number }
  ): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (options?.staffId) params.append('staffId', options.staffId);
      if (options?.method) params.append('method', options.method);
      if (options?.amountReceived) params.append('amountReceived', String(options.amountReceived));

      const query = params.toString() ? `?${params.toString()}` : '';
      await apiClient.post(`/table-sessions/tables/${encodeURIComponent(tableId)}/confirm-payment${query}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};