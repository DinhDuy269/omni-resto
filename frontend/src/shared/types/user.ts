export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'waiter' | 'chef' | 'HQ_ADMIN' | 'BRANCH_MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
export type UserStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: RoleType;
  status: UserStatus;
  avatar: string;
  createdAt: string;
}

export interface UserRequest {
  fullName: string;
  email: string;
  phone: string;
  role: RoleType;
}

export interface UserResponse {
  user?: StaffUser;
  users?: StaffUser[];
}
