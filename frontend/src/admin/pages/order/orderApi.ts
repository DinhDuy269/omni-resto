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

  updateOrderStatus: async (id: string, status: OrderStatus, autoPay: boolean = false): Promise<Order> => {
    try {
      const res = await apiClient.patch<Order | OrderResponse>(`/orders/${id}/status`, null, {
        params: { status: status.toLowerCase(), autoPay },
      });
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  confirmPayment: async (
    id: string,
    paymentMethod?: string,
    amountReceived?: number,
    autoComplete: boolean = false,
    forceConfirm: boolean = false
  ): Promise<Order> => {
    try {
      const params = new URLSearchParams();
      if (paymentMethod) params.append('method', paymentMethod.toLowerCase());
      if (amountReceived !== undefined) params.append('amountReceived', amountReceived.toString());
      params.append('autoComplete', autoComplete.toString());
      if (forceConfirm) params.append('forceConfirm', 'true');

      const res = await apiClient.post<Order | OrderResponse>(`/orders/${id}/confirm-payment?${params.toString()}`);
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  cancelOrderItem: async (
    orderId: string,
    itemId: string,
    reason: string = 'Khách yêu cầu hủy món'
  ): Promise<Order> => {
    try {
      const params = new URLSearchParams();
      if (reason) params.append('reason', reason);

      const res = await apiClient.post<Order | OrderResponse>(`/orders/${orderId}/items/${itemId}/cancel?${params.toString()}`);
      if ('order' in res.data && res.data.order) return res.data.order;
      return res.data as Order;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
