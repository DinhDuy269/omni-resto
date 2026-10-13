import { apiClient, transformAxiosErrorResponse } from './client';
import type { StaffUser } from '../types/admin';

export const staffApi = {
  getAll: async (): Promise<StaffUser[]> => {
    try {
      const res = await apiClient.get<any[]>('/users');
            return res.data.map((u)=>({
        id: u.id,
        full_name: u.fullName || u.full_name || '',
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status || 'active',
        avatar: u.avatar || undefined,
        created_at: u.createdAt || u.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  create: async (data: any): Promise<StaffUser> => {
    try {
      const res = await apiClient.post<any>('/users', data);
      const u = res.data;
      return {
        id: u.id,
        full_name: u.fullName || u.full_name || '',
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status || 'active',
        avatar: u.avatar || undefined,
        created_at: u.createdAt || u.created_at || new Date().toISOString(),
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateStatus: async (id: string, status: string): Promise<void> => {
    try {
      await apiClient.patch(`/users/${id}/status?status=${status.toLowerCase()}`);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};