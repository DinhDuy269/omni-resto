import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { DashboardMetrics } from './types';

export const dashboardApi = {
  getSummaryMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const res = await apiClient.get<DashboardMetrics>('/branches/summary');
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
