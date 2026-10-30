import { apiClient, transformAxiosErrorResponse } from './client';
import type { StaffUser } from '../types/admin';

export const staffApi = {
  getAll: async (): Promise<StaffUser[]> => {
    try {
      const res = await apiClient.get<any[]>('/users');
      return res.data.map((u) => ({
        id: u.id,
        full_name: u.full_name || u.fullName || '',
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status || 'active',
        avatar: u.avatar || undefined,
        created_at: u.created_at || u.createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  create: async (data: any): Promise<StaffUser> => {
    try {
      const res = await apiClient.post<any>('/users', {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: data.status || 'active',
        avatar: data.avatar,
        password: data.password || '123456',
      });
      const u = res.data;
      return {
        id: u.id,
        full_name: u.full_name || u.fullName || '',
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status || 'active',
        avatar: u.avatar || undefined,
        created_at: u.created_at || u.createdAt || new Date().toISOString(),
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  update: async (id: string, data: any): Promise<StaffUser> => {
    try {
      const res = await apiClient.put<any>(`/users/${id}`, {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: data.status,
        avatar: data.avatar,
        password: data.password || undefined,
      });
      const u = res.data;
      return {
        id: u.id,
        full_name: u.full_name || u.fullName || '',
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status || 'active',
        avatar: u.avatar || undefined,
        created_at: u.created_at || u.createdAt || new Date().toISOString(),
      };
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/users/${id}`);
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