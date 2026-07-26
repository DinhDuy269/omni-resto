export type BranchStatus = 'active' | 'maintenance' | 'closed' | 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  managerName: string;
  status: BranchStatus;
  tablesCount: number;
  activeOrdersCount: number;
  dailyRevenue: number;
  rating: number;
}

export type MenuCategory = 'Phở & Bún' | 'Cơm & Món Chính' | 'Món Ăn Kèm' | 'Đồ Uống' | 'Tráng Miệng';
export type MenuStatus = 'available' | 'out_of_stock' | 'discontinued' | 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  description: string;
  status: MenuStatus;
  isBestSeller: boolean;
  image: string;
  branchesCount: number;
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItemInfo {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  orderType: OrderType;
  tableNo?: string;
  status: OrderStatus;
  items: OrderItemInfo[];
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  paymentMethod: 'cash' | 'card' | 'qr_code' | 'CASH' | 'CARD' | 'QR_CODE';
}

export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'waiter' | 'chef' | 'HQ_ADMIN' | 'BRANCH_MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
export type UserStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: RoleType;
  branchId: string;
  branchName: string;
  status: UserStatus;
  avatar: string;
  createdAt: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface TableInfo {
  id: string;
  tableNo: string;
  branchId: string;
  capacity: number;
  status: TableStatus;
  currentOrderAmount?: number;
  occupiedSince?: string;
}
