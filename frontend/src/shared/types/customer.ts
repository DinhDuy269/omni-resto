export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

export interface OrderRequest {
  customerName: string;
  phone: string;
  tableNumber?: string;
  items: {
    menuItemId: string;
    quantity: number;
    note?: string;
  }[];
  totalAmount: number;
}