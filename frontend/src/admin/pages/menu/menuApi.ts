import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { MenuItem, MenuStatus, CategoryOption } from '../../../shared/types/admin';

export const transformCategoryOption = (opt: any): CategoryOption => ({
  id: opt.id,
  category_id: opt.categoryId || opt.category_id,
  name: opt.name,
  option_type: opt.optionType || opt.option_type || 'TOPPING',
  price: Number(opt.price || 0),
  status: opt.status || 'AVAILABLE',
  display_order: opt.displayOrder ?? opt.display_order,
});

export const transformMenuItem = (raw: any): MenuItem => ({
  id: raw.id,
  code: raw.code || '',
  name: raw.name || '',
  category: raw.category || '',
  category_id: raw.categoryId || raw.category_id,
  base_price: Number(raw.basePrice ?? raw.base_price ?? raw.price ?? 0),
  price: Number(raw.price ?? raw.basePrice ?? raw.base_price ?? 0),
  description: raw.description || '',
  ingredients: raw.ingredients || '',
  status: (raw.status?.toUpperCase() || 'AVAILABLE') as MenuStatus,
  is_best_seller: Boolean(raw.isBestSeller ?? raw.is_best_seller),
  meal_periods: raw.mealPeriods || raw.meal_periods || 'ALL_DAY',
  is_available_now: raw.isAvailableNow !== undefined ? raw.isAvailableNow : raw.is_available_now,
  meal_period_note: raw.mealPeriodNote || raw.meal_period_note || '',
  image: raw.image || raw.imageUrl || raw.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  image_url: raw.imageUrl || raw.image_url || raw.image,
  options: Array.isArray(raw.options) ? raw.options.map(transformCategoryOption) : [],
  is_vegetarian: Boolean(raw.isVegetarian ?? raw.is_vegetarian),
  spicy_level: raw.spicyLevel ?? raw.spicy_level,
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
        categoryId: request.category_id || 'cat-01',
        categoryName: request.category,
        basePrice: request.base_price,
        mealPeriods: request.meal_periods || 'ALL_DAY',
        description: request.description,
        ingredients: request.ingredients,
        isBestSeller: request.is_best_seller,
        image: request.image,
        imageUrl: request.image_url || request.image,
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
