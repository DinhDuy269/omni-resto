import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { MenuItem, MenuStatus, CategoryOption } from '../../../shared/types/admin';

export const transformCategoryOption = (opt: any): CategoryOption => ({
  id: opt.id,
  category_id: opt.category_id,
  name: opt.name,
  option_type: opt.option_type || 'TOPPING',
  price: Number(opt.price || 0),
  status: opt.status || 'AVAILABLE',
  display_order: opt.display_order,
});

export const transformMenuItem = (raw: any): MenuItem => ({
  id: raw.id,
  code: raw.code || '',
  name: raw.name || '',
  category: raw.category || '',
  category_id: raw.category_id,
  base_price: Number(raw.base_price ?? 0),
  description: raw.description || '',
  ingredients: raw.ingredients || '',
  status: (raw.status?.toUpperCase() || 'AVAILABLE') as MenuStatus,
  is_best_seller: Boolean(raw.is_best_seller),
  meal_periods: raw.meal_periods || 'ALL_DAY',
  is_available_now: raw.is_available_now,
  meal_period_note: raw.meal_period_note || '',
  image: raw.image || raw.image_url || '/images/food-placeholder.svg',
  options: Array.isArray(raw.options) ? raw.options.map(transformCategoryOption) : [],
  is_vegetarian: Boolean(raw.is_vegetarian),
  spicy_level: raw.spicy_level,
  allergens: raw.allergens,
});

export const menuApi = {
  getMenuItems: async (period?: string): Promise<MenuItem[]> => {
    try {
      const url = period ? `/menu-items?period=${period}` : '/menu-items';
      const res = await apiClient.get<any>(url);
      const rawList = Array.isArray(res.data) ? res.data : (res.data.menu_items || []);
      return rawList.map(transformMenuItem);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getMealPeriodInfo: async (): Promise<any> => {
    try {
      const res = await apiClient.get('/menu-items/current-period');
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    try {
      const res = await apiClient.get<any>(`/menu-items/${id}`);
      const raw = res.data.menu_item || res.data;
      return transformMenuItem(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createMenuItem: async (request: Partial<MenuItem>): Promise<MenuItem> => {
    try {
      const payload = {
        code: request.code,
        name: request.name,
        category_id: request.category_id || 'cat-01',
        category_name: request.category,
        base_price: request.base_price,
        meal_periods: request.meal_periods || 'ALL_DAY',
        description: request.description,
        ingredients: request.ingredients,
        is_best_seller: request.is_best_seller,
        image: request.image,
        image_url: request.image,
      };
      const res = await apiClient.post<any>('/menu-items', payload);
      const raw = res.data.menu_item || res.data;
      return transformMenuItem(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateMenuItemStatus: async (id: string, status: MenuStatus): Promise<MenuItem> => {
    try {
      const res = await apiClient.patch<any>(`/menu-items/${id}/status`, null, { params: { status: status.toLowerCase() } });
      const raw = res.data.menu_item || res.data;
      return transformMenuItem(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
