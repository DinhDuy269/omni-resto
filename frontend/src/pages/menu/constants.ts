import type { MenuCategory } from './types';

export const CATEGORIES: MenuCategory[] = [
  'Phở & Bún',
  'Cơm & Món Chính',
  'Món Ăn Kèm',
  'Đồ Uống',
  'Tráng Miệng',
];

export const INITIAL_MENU_FORM_DATA = {
  code: '',
  name: '',
  category: 'Phở & Bún' as MenuCategory,
  basePrice: 79000,
  description: '',
  isBestSeller: false,
  image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
};
