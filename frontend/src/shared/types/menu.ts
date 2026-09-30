export type MenuCategory = string;
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued' | 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
export type MealPeriod = 'MORNING' | 'NOON' | 'EVENING' | 'ALL_DAY' | 'BREAK' | 'CLOSED';

export interface MealPeriodInfo {
  currentPeriod: string;
  periodName: string;
  timeRange: string;
  currentTime: string;
  isOrderingAvailable: boolean;
  message: string;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryId?: string;
  basePrice: number;
  price?: number;
  description: string;
  ingredients?: string;
  status: MenuStatus;
  isBestSeller: boolean;
  mealPeriods?: string;
  isAvailableNow?: boolean;
  mealPeriodNote?: string;
  image: string;
  imageUrl?: string;
}

export interface MenuItemRequest {
  code?: string;
  name: string;
  categoryId?: string;
  category?: string;
  basePrice: number;
  price?: number;
  description?: string;
  ingredients?: string;
  mealPeriods?: string;
  image?: string;
  imageUrl?: string;
}

export interface MenuItemResponse {
  menu_item?: MenuItem;
  menu_items?: MenuItem[];
}
