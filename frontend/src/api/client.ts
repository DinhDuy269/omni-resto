import axios from 'axios';
import type {
  Branch,
  MenuItem,
  Order,
  StaffUser,
  TableInfo,
  BranchStatus,
  MenuStatus,
  OrderStatus,
  UserStatus,
  TableStatus,
} from '../types/admin';

export const API_BASE_URL = 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend Health Connection Check
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/branches', { timeout: 3000 });
    return res.status >= 200 && res.status < 400;
  } catch (error: any) {
    // If backend server returns any HTTP status (e.g. 200, 401, 403), server is ALIVE!
    if (error.response && error.response.status) {
      return true;
    }
    return false;
  }
};

// API Endpoint Services
export const apiService = {
  // Branches API
  getBranches: async (): Promise<Branch[]> => {
    const res = await apiClient.get<Branch[]>('/branches');
    return res.data;
  },
  createBranch: async (data: Partial<Branch>): Promise<Branch> => {
    const res = await apiClient.post<Branch>('/branches', data);
    return res.data;
  },
  updateBranchStatus: async (id: string, status: BranchStatus): Promise<Branch> => {
    const res = await apiClient.patch<Branch>(`/branches/${id}/status`, null, { params: { status } });
    return res.data;
  },

  // Master Menu API
  getMenuItems: async (): Promise<MenuItem[]> => {
    const res = await apiClient.get<MenuItem[]>('/menu-items');
    return res.data;
  },
  createMenuItem: async (data: Partial<MenuItem>): Promise<MenuItem> => {
    const res = await apiClient.post<MenuItem>('/menu-items', data);
    return res.data;
  },
  updateMenuItemStatus: async (id: string, status: MenuStatus): Promise<MenuItem> => {
    const res = await apiClient.patch<MenuItem>(`/menu-items/${id}/status`, null, { params: { status } });
    return res.data;
  },

  // Orders API
  getOrders: async (branchId?: string, status?: OrderStatus): Promise<Order[]> => {
    const res = await apiClient.get<Order[]>('/orders', { params: { branchId, status } });
    return res.data;
  },
  createOrder: async (data: Partial<Order>): Promise<Order> => {
    const res = await apiClient.post<Order>('/orders', data);
    return res.data;
  },
  updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const res = await apiClient.patch<Order>(`/orders/${id}/status`, null, { params: { status } });
    return res.data;
  },

  // Staff & RBAC Users API
  getUsers: async (): Promise<StaffUser[]> => {
    const res = await apiClient.get<StaffUser[]>('/users');
    return res.data;
  },
  createUser: async (data: Partial<StaffUser>): Promise<StaffUser> => {
    const res = await apiClient.post<StaffUser>('/users', data);
    return res.data;
  },
  updateUserStatus: async (id: string, status: UserStatus): Promise<StaffUser> => {
    const res = await apiClient.patch<StaffUser>(`/users/${id}/status`, null, { params: { status } });
    return res.data;
  },

  // Floor Tables API
  getTables: async (branchId: string, status?: TableStatus): Promise<TableInfo[]> => {
    const res = await apiClient.get<TableInfo[]>('/tables', { params: { branchId, status } });
    return res.data;
  },
  updateTableStatus: async (id: string, status: TableStatus): Promise<TableInfo> => {
    const res = await apiClient.patch<TableInfo>(`/tables/${id}/status`, null, { params: { status } });
    return res.data;
  },
};
