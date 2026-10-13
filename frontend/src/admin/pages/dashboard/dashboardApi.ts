import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { DashboardMetrics } from './types';

export const dashboardApi = {
  getSummaryMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const res = await apiClient.get<any>('/dashboard/summary');
      const d = res.data || {};
      return {
        total_tables: Number(d.totalTables ?? d.total_tables ?? 0),
        total_orders: Number(d.totalOrders ?? d.total_orders ?? 0),
        total_revenue: Number(d.totalRevenue ?? d.total_revenue ?? 0),
        active_staff: Number(d.activeStaff ?? d.active_staff ?? 0),
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
