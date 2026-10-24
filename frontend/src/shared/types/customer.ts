// ─────────────────────────────────────────────────────────────
// PHẦN CHO TRANG ADMIN (Quản lý khách hàng hội viên)
// ─────────────────────────────────────────────────────────────

export type MembershipTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type CustomerStatus = 'active' | 'inactive';

export interface CustomerResponse {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  membership_tier: MembershipTier;
  loyalty_points: number;
  status: CustomerStatus;
  created_at: string;
  token?: string;
  // Alias tương thích ngược nếu component UI truy cập fullName
  fullName?: string;
}

// ─────────────────────────────────────────────────────────────
// PHẦN ĐĂNG KÝ KHÁCH HÀNG (Thuần snake_case theo chuẩn Backend)
// ─────────────────────────────────────────────────────────────

export interface CustomerRegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  date_of_birth: string; // Ngày sinh bắt buộc
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