export interface ChatRecommendedDish {
  id: string;
  name: string;
  code?: string;
  category: string;
  price: number;
  description: string;
  imageUrl?: string;
  isVegetarian?: boolean;
  spicyLevel?: number;
  allergens?: string[] | string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  recommendedDishes?: ChatRecommendedDish[];
}

export interface ChatPromptChip {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}
