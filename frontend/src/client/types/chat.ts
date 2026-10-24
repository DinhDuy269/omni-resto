export interface ChatRecommendedDish {
  id: string;
  name: string;
  code?: string;
  category: string;
  price: number;
  description: string;
  image_url?: string;
  is_vegetarian?: boolean;
  spicy_level?: number;
  allergens?: string[] | string;
  meal_periods?: string;
  mealPeriods?: string;
  available_now?: boolean;
  availableNow?: boolean;
  meal_period_note?: string;
  mealPeriodNote?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  recommended_dishes?: ChatRecommendedDish[];
}

export interface ChatPromptChip {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}
