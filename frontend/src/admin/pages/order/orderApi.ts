import { apiClient, transformAxiosErrorResponse, toQueryString } from '../../../shared/api/client';
import type { Order, OrderResponse, OrderStatus } from '../../../shared/types/admin';

export const orderApi = {
  getOrders: async (status?: OrderStatus): Promise<Order[]> => {
    try {
      const q = toQueryString({ status: status ? status.toLowerCase() : undefined });
      const res = await apiClient.get<Order[] | OrderResponse>(`/orders${q}`);
      if (Array.isArray(res.data)) return res.data;
      return res.data.orders || [];
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getOrder: async (id: string): Promise<Order> => {
    try {
      const res = await apiClient.get<Order | OrderResponse>(`/orders/${id}`);
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createOrder: async (request: Partial<Order>): Promise<Order> => {
    try {
      const res = await apiClient.post<Order | OrderResponse>('/orders', request);
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    try {
      const res = await apiClient.patch<Order | OrderResponse>(`/orders/${id}/status`, null, { params: { status: status.toLowerCase() } });
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
