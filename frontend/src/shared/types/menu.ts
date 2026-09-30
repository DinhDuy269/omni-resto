export type MenuCategory = 'Phở & Bún' | 'Cơm & Món Chính' | 'Món Ăn Kèm' | 'Đồ Uống' | 'Tráng Miệng';
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued' | 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  description: string;
  ingredients?: string;
  status: MenuStatus;
  isBestSeller: boolean;
  image: string;
}

export interface MenuItemRequest {
  code: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  description?: string;
  ingredients?: string;
  image?: string;
}

export interface MenuItemResponse {
  menu_item?: MenuItem;
  menu_items?: MenuItem[];
}
