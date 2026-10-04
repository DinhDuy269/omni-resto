import type { CustomerRegisterPayload, CustomerResponse } from "../../shared/types/customer";

// Địa chỉ backend. Có thể đặt VITE_API_URL trong file .env của frontend
const API_URL: string = import.meta.env?.VITE_API_URL || "http://localhost:8080";

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function registerCustomer(payload: CustomerRegisterPayload): Promise<CustomerResponse> {
  const res = await fetch(`${API_URL}/api/customers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
throw new ApiRequestError(res.status, data.message || `Đăng ký chưa thành công (mã lỗi ${res.status})`, data.errors);
  }
  return data as CustomerResponse;
}
export async function loginCustomer(payload: { identifier: string; password: string }): Promise<CustomerResponse> {
  const res = await fetch(`${API_URL}/api/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
throw new ApiRequestError(res.status, data.message || `Đăng nhập chưa thành công (mã lỗi ${res.status})`, data.errors);  }
  return data as CustomerResponse;
}