import { apiClient, transformAxiosErrorResponse, toQueryString } from '../../../shared/api/client';
import type { TableInfo, TableStatus } from '../../../shared/types/admin';

export const transformTableInfo = (t: any): TableInfo => ({
  id: t.id,
  table_no: t.tableNo || t.table_no || '',
  capacity: Number(t.capacity || 4),
  status: (t.status || 'AVAILABLE') as TableStatus,
  current_order_amount: t.currentOrderAmount ?? t.current_order_amount,
  occupied_since: t.occupiedSince ?? t.occupied_since,
  qr_secret_token: t.qrSecretToken || t.qr_secret_token || '',
  is_verified: t.isVerified ?? t.is_verified,
  payment_requested: t.paymentRequested ?? t.payment_requested,
  is_paid: t.isPaid ?? t.is_paid,
  active_order_number: t.activeOrderNumber || t.active_order_number,
  active_session_token: t.activeSessionToken || t.active_session_token,
});

export const tableApi = {
  getTables: async (status?: TableStatus): Promise<TableInfo[]> => {
    try {
      const q = toQueryString({ status: status ? status.toLowerCase() : undefined });
      const res = await apiClient.get<any>(`/tables${q}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.tables || []);
      return list.map(transformTableInfo);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateTableStatus: async (id: string, status: TableStatus): Promise<TableInfo> => {
    try {
      const res = await apiClient.patch<any>(`/tables/${id}/status`, null, {
        params: { status: status.toLowerCase() },
      });
      const raw = res.data.table || res.data;
      return transformTableInfo(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
