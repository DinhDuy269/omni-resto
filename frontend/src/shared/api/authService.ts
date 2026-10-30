import api from './axiosClient';

// Enums / Types
export type RoleType = 'admin' | 'store_manager' | 'cashier' | 'chef' | 'waiter' | 'customer';
export type UserStatus = 'pending_verification' | 'active' | 'inactive' | 'blocked';
export type OtpPurpose = 'register_verification' | 'password_reset';

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  date_of_birth: string;
  otp?: string;
}

export interface VerifyRegisterOtpRequest {
  phone?: string;
  email?: string;
  otp_code: string;
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
  full_name: string;
  phone?: string;
  email: string;
  customer_type?: string;
  member_tier?: string;
  points?: number;
  role?: RoleType;
  status?: UserStatus;
}

export interface SendOtpRequest {
  phone?: string;
  email?: string;
}

export interface VerifyResetOtpRequest {
  phone?: string;
  email?: string;
  otp_code: string;
}

export interface ResetPasswordRequest {
  phone?: string;
  email?: string;
  otp_code?: string;
  otp?: string;
  new_password?: string;
  
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
  // 1. Gửi mã OTP (đến SĐT hoặc Email)
  sendOtp: async (data: SendOtpRequest): Promise<{ message: string; otp?: string }> => {
    const res = await api.post('/auth/send-otp', data);
    return res.data;
  },

  // 2. Đăng ký tài khoản (kèm date_of_birth và otp)
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  // 3. Xác minh OTP Đăng ký
  verifyRegisterOtp: async (data: VerifyRegisterOtpRequest) => {
    const res = await api.post('/auth/verify-register-otp', {
      phone: data.phone,
      email: data.email,
      otp: data.otp_code,
    });
    return res.data;
  },

  // 4. Đăng nhập (gửi username, username_or_email, identifier để tương thích mọi DTO)
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const target = data.username || data.username_or_email || data.identifier || '';
    const res = await api.post('/auth/login', {
      username: target,
      username_or_email: target,
      identifier: target,
      password: data.password,
    });
    return res.data;
  },

  // 5. Yêu cầu mã OTP Quên mật khẩu
  forgotPassword: async (data: SendOtpRequest): Promise<{ message: string; otp?: string }> => {
    const res = await api.post('/auth/send-otp', data);
    return res.data;
  },

  // 6. Xác minh OTP Quên mật khẩu
  verifyResetOtp: async (data: VerifyResetOtpRequest) => {
    const res = await api.post('/auth/verify-reset-otp', {
      phone: data.phone,
      email: data.email,
      otp: data.otp_code,
    });
    return res.data;
  },

  // 7. Đặt lại mật khẩu mới (POST /auth/forgot-password)
  resetPassword: async (data: ResetPasswordRequest) => {
    const payload = {
      phone: data.phone,
      email: data.email,
      otp: data.otp || data.otp_code,
      new_password: data.new_password ,
      newPassword: data.new_password,
    };
    const res = await api.post('/auth/forgot-password', payload);
    return res.data;
  },

  // 8. Gửi lại mã OTP
  resendOtp: async (target: string, _purpose?: OtpPurpose) => {
    const payload = target.includes('@') ? { email: target } : { phone: target };
    const res = await api.post('/auth/send-otp', payload);
    return res.data;
  },

  // --- ADMIN APIs ---

  // 8. Admin lấy danh sách người dùng
  getAllUsers: async () => {
    const res = await api.get('/auth/admin/users');
    return res.data;
  },

  // 9. Admin cập nhật trạng thái tài khoản
  updateUserStatus: async (userId: string, status: UserStatus) => {
    const res = await api.put(`/auth/admin/users/${userId}/status`, { status });
    return res.data;
  },
};