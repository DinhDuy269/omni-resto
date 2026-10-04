import type { MenuItem, OrderRequest } from '../types/customer';

const API_BASE_URL = 'http://localhost:8080/api/v1'; // Điều chỉnh port/URL backend nếu cần

export const customerApi = {
  // Gửi OTP
  sendOtp: async (phone: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/customer/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  // Xác thực OTP
  verifyOtp: async (phone: string, otp: string): Promise<{ success: boolean; token?: string; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    return res.json();
  },

  // Lấy danh sách thực đơn
  getMenu: async (): Promise<MenuItem[]> => {
    const res = await fetch(`${API_BASE_URL}/customer/menu`);
    if (!res.ok) throw new Error('Không thể tải thực đơn');
    return res.json();
  },

  // Gửi đơn đặt món
  createOrder: async (order: OrderRequest): Promise<{ success: boolean; orderId: string }> => {
    const res = await fetch(`${API_BASE_URL}/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return res.json();
  },
};