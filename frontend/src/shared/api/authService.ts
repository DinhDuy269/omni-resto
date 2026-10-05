import api from './axiosClient';

// Enums / Types
export type RoleType = 'ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'CHEF' | 'WAITER' | 'CUSTOMER';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type OtpPurpose = 'REGISTER_VERIFICATION' | 'PASSWORD_RESET';

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface VerifyRegisterOtpRequest {
  email: string;
  otpCode: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  role: RoleType;
  status: UserStatus;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otpCode: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface UserAdminDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: RoleType;
  status: UserStatus;
  createdAt: string;
}

export const authApi = {
  // 1. Đăng ký tài khoản
  register: async (data: RegisterRequest) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  // 2. Xác minh OTP Đăng ký
  verifyRegisterOtp: async (data: VerifyRegisterOtpRequest) => {
    const res = await api.post('/auth/verify-register-otp', data);
    return res.data;
  },

  // 3. Đăng nhập
  login: async (data: LoginRequest) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  // 4. Yêu cầu mã OTP Quên mật khẩu
  forgotPassword: async (data: SendOtpRequest) => {
    const res = await api.post('/auth/forgot-password', data);
    return res.data;
  },

  // 5. Xác minh OTP Quên mật khẩu
  verifyResetOtp: async (data: VerifyResetOtpRequest) => {
    const res = await api.post('/auth/verify-reset-otp', data);
    return res.data;
  },

  // 6. Đặt lại mật khẩu mới
  resetPassword: async (data: ResetPasswordRequest) => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },

  // 7. Gửi lại mã OTP
  resendOtp: async (email: string, purpose: OtpPurpose) => {
    const res = await api.post(`/auth/resend-otp?email=${encodeURIComponent(email)}&purpose=${purpose}`);
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