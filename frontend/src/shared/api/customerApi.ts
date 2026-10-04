import type { CustomerResponse } from "../types/customer";

const API_URL: string = import.meta.env?.VITE_API_URL || "http://localhost:8080";

export type CustomerStatus = "active" | "inactive";

export async function fetchCustomers(): Promise<CustomerResponse[]> {
  const res = await fetch(`${API_URL}/api/customers`);
  if (!res.ok) throw new Error("Không tải được danh sách khách hàng");
  return res.json();
}

export async function updateCustomerStatus(id: string, status: CustomerStatus): Promise<CustomerResponse> {
  const res = await fetch(`${API_URL}/api/customers/${id}/status?status=${status}`, { method: "PATCH" });
  if (!res.ok) throw new Error("Không cập nhật được trạng thái");
  return res.json();
}