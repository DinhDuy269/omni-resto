import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { MenuItem, MenuStatus, CategoryOption } from '../../../shared/types/admin';

export const transformCategoryOption = (opt: any): CategoryOption => ({
  id: opt.id,
  category_id: opt.category_id,
  name: opt.name,
  option_type: opt.option_type?.toLowerCase() || 'topping',
  price: Number(opt.price || 0),
  status: opt.status?.toLowerCase() || 'available',
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
  status: (raw.status?.toLowerCase() || 'available') as MenuStatus,
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

export const CATEGORY_MAP: Record<string, string> = {
  'Phở & Bún Nước': 'cat-01',
  'Cơm Tấm & Món Mặn': 'cat-02',
  'Bánh Mì & Điểm Tâm': 'cat-03',
  'Lẩu & Món Nhắm': 'cat-04',
  'Khai Vị & Gỏi Cuốn': 'cat-05',
  'Đồ Uống & Cà Phê': 'cat-06',
  'Đồ Uống & Tráng Miệng': 'cat-06',
  'Tráng Miệng & Chè': 'cat-07',
  'Món Chay Thanh Tịnh': 'cat-08',
  'Hải Sản Tươi Sống': 'cat-09',
  'Combo Tiết Kiệm': 'cat-10',
};

export const resolveCategoryId = (categoryId?: string, categoryName?: string): string => {
  if (categoryId && categoryId.startsWith('cat-')) return categoryId;
  if (categoryName && CATEGORY_MAP[categoryName]) return CATEGORY_MAP[categoryName];
  return categoryId || 'cat-01';
};

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
      const catId = resolveCategoryId(request.category_id, request.category);
      const payload = {
        code: request.code,
        name: request.name,
        category_id: catId,
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

  updateMenuItem: async (id: string, request: Partial<MenuItem>): Promise<MenuItem> => {
    try {
      const catId = resolveCategoryId(request.category_id, request.category);
      const payload = {
        name: request.name,
        category_id: catId,
        category_name: request.category,
        base_price: request.base_price,
        meal_periods: request.meal_periods || 'ALL_DAY',
        description: request.description,
        ingredients: request.ingredients,
        is_best_seller: request.is_best_seller,
        image: request.image,
        image_url: request.image,
      };
      const res = await apiClient.put<any>(`/menu-items/${id}`, payload);
      const raw = res.data.menu_item || res.data;
      return transformMenuItem(raw);
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/menu-items/${id}`);
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
