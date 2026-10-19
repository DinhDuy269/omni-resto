import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { StaffUser, UserStatus } from '../../../shared/types/admin';

export const transformStaffUser = (usr: any): StaffUser => ({
  id: usr.id,
  full_name: usr.full_name || usr.fullName || '',
  email: usr.email || '',
  phone: usr.phone || '',
  role: usr.role || 'store_manager',
  status: (usr.status || 'active') as UserStatus,
  avatar: usr.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
  created_at: usr.created_at || usr.createdAt,
});

export const userApi = {
  getUsers: async (): Promise<StaffUser[]> => {
    try {
      const res = await apiClient.get<any>('/users');
      const list = Array.isArray(res.data) ? res.data : (res.data.users || []);
      return list.map(transformStaffUser);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getUser: async (id: string): Promise<StaffUser> => {
    try {
      const res = await apiClient.get<any>(`/users/${id}`);
      const raw = res.data.user || res.data;
      return transformStaffUser(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createUser: async (request: Partial<StaffUser>): Promise<StaffUser> => {
    try {
      const payload = {
        full_name: request.full_name,
        fullName: request.full_name,
        email: request.email,
        phone: request.phone,
        role: request.role,
        avatar: request.avatar,
      };
      const res = await apiClient.post<any>('/users', payload);
      const raw = res.data.user || res.data;
      return transformStaffUser(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateUserStatus: async (id: string, status: UserStatus): Promise<StaffUser> => {
    try {
      const res = await apiClient.patch<any>(`/users/${id}/status`, null, {
        params: { status: status.toLowerCase() },
      });
      const raw = res.data.user || res.data;
      return transformStaffUser(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
