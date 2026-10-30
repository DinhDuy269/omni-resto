export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'waiter' | 'chef';
export type UserStatus = 'active' | 'inactive';

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: RoleType;
  status: UserStatus;
  avatar?: string;
  created_at?: string;
}

export interface UserRequest {
  full_name: string;
  email: string;
  phone: string;
  role: RoleType;
  password?: string;
  status?: UserStatus;
  avatar?: string;
}

export interface UserResponse {
  user?: StaffUser;
  users?: StaffUser[];
}
