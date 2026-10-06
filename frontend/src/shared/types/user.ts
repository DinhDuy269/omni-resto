export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'waiter' | 'chef' | 'HQ_ADMIN' | 'BRANCH_MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
export type UserStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: RoleType;
  status: UserStatus;
  avatar: string;
  created_at: string;
}

export interface UserRequest {
  full_name: string;
  email: string;
  phone: string;
  role: RoleType;
}

export interface UserResponse {
  user?: StaffUser;
  users?: StaffUser[];
}
