import api from './axiosClient';

// Enums / Types
export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'chef' | 'waiter' | 'customer' | 'staff';
export type UserStatus = 'pending_verification' | 'active' | 'inactive' | 'blocked';

export interface RegisterRequest {
  full_name: string;
  email?: string;
  phone: string;
  password: string;
  date_of_birth?: string;
}

export interface LoginRequest {
  username_or_email?: string;
  username?: string;
  identifier?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type?: string;
  id?: string;
  user_id?: string;
  full_name?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  customer_type?: string;
  member_tier?: string;
  memberTier?: string;
  points?: number;
  role?: RoleType | string;
  status?: UserStatus;
  avatar?: string;
}

export interface UserAdminDto {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: RoleType;
  status: UserStatus;
  created_at: string;
}

export const authApi = {
  // 1. Đăng ký tài khoản trực tiếp (không qua OTP trung gian)
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  // 2. Đăng nhập thống nhất (tự động nhận diện Khách hàng hoặc Nhân viên / Quản trị)
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const target = (data.username || data.username_or_email || data.identifier || '').trim();
    const res = await api.post('/auth/login', {
      username: target,
      password: data.password,
    });
    return res.data;
  },

  // --- ADMIN APIs ---
  getAllUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },

  updateUserStatus: async (userId: string, status: UserStatus) => {
    const res = await api.patch(`/users/${userId}/status?status=${status}`);
    return res.data;
  },
};
