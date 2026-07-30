import { apiClient, transformAxiosErrorResponse, toQueryString } from '../../../shared/api/client';
import type { TableInfo, TableResponse, TableStatus } from '../../../shared/types/admin';

export const tableApi = {
  getTables: async (branchId: string, status?: TableStatus): Promise<TableInfo[]> => {
    try {
      const q = toQueryString({ branchId, status });
      const res = await apiClient.get<TableInfo[] | TableResponse>(`/tables${q}`);
      if (Array.isArray(res.data)) return res.data;
      return res.data.tables || [];
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateTableStatus: async (id: string, status: TableStatus): Promise<TableInfo> => {
    try {
      const res = await apiClient.patch<TableInfo | TableResponse>(`/tables/${id}/status`, null, { params: { status } });
      if ('table' in res.data && res.data.table) return res.data.table;
      return res.data as TableInfo;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
