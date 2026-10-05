// ─────────────────────────────────────────────────────────────
// PHẦN CHO TRANG ADMIN (Quản lý khách hàng hội viên)
// ─────────────────────────────────────────────────────────────

export type MembershipTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type CustomerStatus = 'active' | 'inactive';

export interface CustomerResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  membershipTier: MembershipTier;
  loyaltyPoints: number;
  status: CustomerStatus;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// PHẦN CHO BẠN BẠN (FoodCard, Đặt món & API Customer)
// ─────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
}

export interface OrderItemRequest {
  menuItemId: string;
  name?: string;
  quantity: number;
  price?: number;
  notes?: string;
}

export interface OrderRequest {
  branchId?: string;
  branchName?: string;
  orderMode?: string;
  tableNo?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMethod?: string;
  items?: OrderItemRequest[];
  totalAmount?: number;
}