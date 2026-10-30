export type MenuCategory = string;
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued';
export type MealPeriod = 'morning' | 'noon' | 'break_time' | 'evening' | 'all_day' | 'closed';

export interface MealPeriodInfo {
  current_period?: string;
  period_name?: string;
  time_range?: string;
  current_time?: string;
  is_ordering_available?: boolean;
  message?: string;
}

export interface CategoryOption {
  id: string;
  category_id?: string;
  name: string;
  option_type?: 'size' | 'topping';
  price: number;
  status: string;
  display_order?: number;
}

export interface MenuItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  category_id?: string;
  base_price: number;
  description: string;
  ingredients?: string;
  status: MenuStatus;
  is_best_seller?: boolean;
  meal_periods?: string;
  is_available_now?: boolean;
  meal_period_note?: string;
  image: string;
  options?: CategoryOption[];
  is_vegetarian?: boolean;
  spicy_level?: number;
  allergens?: string[];
}

export interface MenuItemRequest {
  code?: string;
  name: string;
  category_id?: string;
  category?: string;
  base_price?: number;
  description?: string;
  ingredients?: string;
  status?: MenuStatus;
  is_best_seller?: boolean;
  meal_periods?: string;
  image?: string;
  options?: CategoryOption[];
}

export interface MenuItemResponse {
  menu_item?: MenuItem;
  menu_items?: MenuItem[];
}
