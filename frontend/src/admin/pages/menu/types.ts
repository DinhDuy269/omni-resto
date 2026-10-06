export type MenuCategory = 'Phở & Bún Nước' | 'Cơm Tấm & Món Mặn' | 'Bánh Mì & Điểm Tâm' | 'Lẩu & Món Nhắm' | 'Đồ Uống & Tráng Miệng' | string;
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued' | 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface MenuItemFormData {
  code: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  description: string;
  isBestSeller: boolean;
  image: string;
}
