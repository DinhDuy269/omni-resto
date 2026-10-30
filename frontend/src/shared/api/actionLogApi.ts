import api from './axiosClient';

export interface ActionLog {
  id: string;
  userName?: string;
  user_name?: string;
  userRole?: string;
  user_role?: string;
  screen: string;
  feature: string;
  action: string;
  createdAt?: string;
  created_at?: string;
}

export interface ActionLogPageResponse {
  content: ActionLog[];
  totalElements?: number;
  total_elements?: number;
  totalPages?: number;
  total_pages?: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ActionLogStats {
  totalLogs?: number;
  total_logs?: number;
  todayLogs?: number;
  today_logs?: number;
  topScreen?: string;
  top_screen?: string;
  topScreenCount?: number;
  top_screen_count?: number;
}

export interface ActionLogFilterParams {
  screen?: string;
  query?: string;
  page?: number;
  size?: number;
}

export const actionLogApi = {
  getLogs: async (params?: ActionLogFilterParams): Promise<ActionLogPageResponse> => {
    const response = await api.get('/action-logs', { params });
    return response.data;
  },

  getStats: async (): Promise<ActionLogStats> => {
    const response = await api.get('/action-logs/stats');
    return response.data;
  },

  record: async (payload: { screen: string; feature: string; action: string }): Promise<ActionLog> => {
    const response = await api.post('/action-logs', payload);
    return response.data;
  },
};
