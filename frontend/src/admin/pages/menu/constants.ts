import type { MenuCategory } from './types';

export const CATEGORIES: MenuCategory[] = [
  'Phở & Bún Nước',
  'Cơm Tấm & Món Mặn',
  'Bánh Mì & Điểm Tâm',
  'Lẩu & Món Nhắm',
  'Đồ Uống & Tráng Miệng',
];

export const INITIAL_MENU_FORM_DATA = {
  code: '',
  name: '',
  category: 'Phở & Bún Nước' as MenuCategory,
  basePrice: 79000,
  description: '',
  isBestSeller: false,
  image: '/images/food-placeholder.svg',
};
