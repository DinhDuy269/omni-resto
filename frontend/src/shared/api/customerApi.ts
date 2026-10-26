import { apiClient, transformAxiosErrorResponse } from './client';
import type { MenuItem, OrderRequest, CustomerResponse, CustomerStatus } from '../types/customer';

const API_BASE_URL = 'http://localhost:8080/api'; // Đường dẫn chuẩn API Backend

// ─────────────────────────────────────────────────────────────
// PHẦN DÀNH CHO ADMIN (Quản lý khách hàng hội viên)
// ─────────────────────────────────────────────────────────────

// 1. Lấy danh sách khách hàng cho trang Admin
export const fetchCustomers = async (): Promise<CustomerResponse[]> => {
  try {
    const res = await apiClient.get<CustomerResponse[]>('/v1/auth/customer/admin/customers');
    return res.data;
  } catch (error) {
    throw transformAxiosErrorResponse(error);
  }
};

// 2. Cập nhật trạng thái khách hàng (active / inactive)
export const updateCustomerStatus = async (
  id: string,
  status: CustomerStatus | string
): Promise<CustomerResponse> => {
  try {
    const res = await apiClient.patch<CustomerResponse>(
      `/v1/auth/customer/admin/customers/${id}/status?status=${status}`
    );
    return res.data;
  } catch (error) {
    throw transformAxiosErrorResponse(error);
  }
};

// ─────────────────────────────────────────────────────────────
// PHẦN CỦA BẠN BẠN LÀM (Khách hàng vãng lai & Đặt món online)
// ─────────────────────────────────────────────────────────────
export const customerApi = {
  // Gửi OTP
  sendOtp: async (phone: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/v1/customer/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },
  // Xác thực OTP
  verifyOtp: async (phone: string, otp: string): Promise<{ success: boolean; token?: string; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/v1/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    return res.json();
  },
  // Lấy danh sách thực đơn
  getMenu: async (): Promise<MenuItem[]> => {
    const res = await fetch(`${API_BASE_URL}/v1/customer/menu`);
    if (!res.ok) throw new Error('Không thể tải thực đơn');
    return res.json();
  },
  // Gửi đơn đặt món
  createOrder: async (order: OrderRequest): Promise<{ success: boolean; orderId: string }> => {
    const res = await fetch(`${API_BASE_URL}/v1/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return res.json();
  },
  // Gắn thêm 2 hàm Admin vào object để gọi theo cách nào cũng được
  fetchCustomers,
  updateCustomerStatus,
};

export default customerApi;