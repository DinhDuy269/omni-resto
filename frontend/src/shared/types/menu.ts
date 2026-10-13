export type MenuCategory = string;
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued' | 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
export type MealPeriod = 'MORNING' | 'NOON' | 'EVENING' | 'ALL_DAY' | 'BREAK' | 'CLOSED';

export interface MealPeriodInfo {
<<<<<<< HEAD
  current_period: string;
  period_name: string;
  time_range: string;
  current_time: string;
  is_ordering_available: boolean;
  message: string;
=======
  current_period?: string;
  period_name?: string;
  time_range?: string;
  current_time?: string;
  is_ordering_available?: boolean;
  message?: string;
>>>>>>> main
}

export interface CategoryOption {
  id: string;
<<<<<<< HEAD
  category_id: string;
  name: string;
  option_type: 'SIZE' | 'TOPPING';
=======
  category_id?: string;
  name: string;
  option_type?: 'SIZE' | 'TOPPING';
>>>>>>> main
  price: number;
  status: string;
  display_order?: number;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: string;
  category_id?: string;
  base_price: number;
  price?: number;
  description: string;
  ingredients?: string;
  status: MenuStatus;
<<<<<<< HEAD
  is_best_seller: boolean;
=======
  is_best_seller?: boolean;
>>>>>>> main
  meal_periods?: string;
  is_available_now?: boolean;
  meal_period_note?: string;
  image: string;
  image_url?: string;
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
<<<<<<< HEAD
  base_price: number;
=======
  base_price?: number;
>>>>>>> main
  price?: number;
  description?: string;
  ingredients?: string;
  meal_periods?: string;
  image?: string;
  image_url?: string;
}

export interface MenuItemResponse {
  menu_item?: MenuItem;
  menu_items?: MenuItem[];
}
