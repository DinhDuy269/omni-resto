export type MenuCategory = 'Phở & Bún' | 'Cơm & Món Chính' | 'Món Ăn Kèm' | 'Đồ Uống' | 'Tráng Miệng';
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
