import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { StaffUser, UserResponse, UserStatus } from '../../../shared/types/admin';

export const userApi = {
  getUsers: async (): Promise<StaffUser[]> => {
    try {
      const res = await apiClient.get<StaffUser[] | UserResponse>('/users');
      if (Array.isArray(res.data)) return res.data;
      return res.data.users || [];
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getUser: async (id: string): Promise<StaffUser> => {
    try {
      const res = await apiClient.get<StaffUser | UserResponse>(`/users/${id}`);
      if ('user' in res.data && res.data.user) return res.data.user;
      return res.data as StaffUser;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createUser: async (request: Partial<StaffUser>): Promise<StaffUser> => {
    try {
      const res = await apiClient.post<StaffUser | UserResponse>('/users', request);
      if ('user' in res.data && res.data.user) return res.data.user;
      return res.data as StaffUser;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateUserStatus: async (id: string, status: UserStatus): Promise<StaffUser> => {
    try {
      const res = await apiClient.patch<StaffUser | UserResponse>(`/users/${id}/status`, null, { params: { status } });
      if ('user' in res.data && res.data.user) return res.data.user;
      return res.data as StaffUser;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
