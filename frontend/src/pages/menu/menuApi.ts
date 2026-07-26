import { apiClient, transformAxiosErrorResponse } from '../../api/client';
import type { MenuItem, MenuItemResponse, MenuStatus } from '../../types/admin';

export const menuApi = {
  getMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const res = await apiClient.get<MenuItem[] | MenuItemResponse>('/menu-items');
      if (Array.isArray(res.data)) return res.data;
      return res.data.menu_items || [];
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    try {
      const res = await apiClient.get<MenuItem | MenuItemResponse>(`/menu-items/${id}`);
      if ('menu_item' in res.data && res.data.menu_item) return res.data.menu_item;
      return res.data as MenuItem;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createMenuItem: async (request: Partial<MenuItem>): Promise<MenuItem> => {
    try {
      const res = await apiClient.post<MenuItem | MenuItemResponse>('/menu-items', {
        menu_item: request,
      });
      if ('menu_item' in res.data && res.data.menu_item) return res.data.menu_item;
      return res.data as MenuItem;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateMenuItemStatus: async (id: string, status: MenuStatus): Promise<MenuItem> => {
    try {
      const res = await apiClient.patch<MenuItem | MenuItemResponse>(`/menu-items/${id}/status`, null, { params: { status } });
      if ('menu_item' in res.data && res.data.menu_item) return res.data.menu_item;
      return res.data as MenuItem;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
