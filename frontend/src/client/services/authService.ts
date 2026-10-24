import type { CustomerRegisterPayload, CustomerResponse } from "../../shared/types/customer";

// Sử dụng proxy /api của Vite hoặc cấu hình VITE_API_URL
const API_URL: string = import.meta.env?.VITE_API_URL || "";

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Đăng ký tài khoản thành viên - Giao tiếp thuần chuẩn snake_case
 */
export async function registerCustomer(payload: CustomerRegisterPayload): Promise<CustomerResponse> {
  const res = await fetch(`${API_URL}/api/customers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      date_of_birth: payload.date_of_birth,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = data.details || data.errors;
    throw new ApiRequestError(
      res.status,
      data.message || `Đăng ký chưa thành công (mã lỗi ${res.status})`,
      fieldErrors
    );
  }

  return {
    ...data,
    fullName: data.full_name || data.fullName,
  } as CustomerResponse;
}

/**
 * Đăng nhập thành viên - Giao tiếp thuần chuẩn snake_case
 */
export async function loginCustomer(payload: { identifier: string; password: string }): Promise<CustomerResponse> {
  const res = await fetch(`${API_URL}/api/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: payload.identifier,
      password: payload.password,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = data.details || data.errors;
    throw new ApiRequestError(
      res.status,
      data.message || `Đăng nhập chưa thành công (mã lỗi ${res.status})`,
      fieldErrors
    );
  }

  return {
    ...data,
    fullName: data.full_name || data.fullName,
  } as CustomerResponse;
}