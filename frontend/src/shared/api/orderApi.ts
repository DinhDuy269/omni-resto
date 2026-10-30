import { apiClient, transformAxiosErrorResponse } from './client';
import type { Order, OrderStatus } from '../types/admin';

const STAFF_HEADERS = { 'X-Staff-Key': 'STAFF_SECRET_KEY' };

export const orderApi = {
    getAll: async (status?: string): Promise<Order[]> => {
        try {
            const url = status && status.toLowerCase() !== 'all' ? `/orders?status=${status.toLowerCase()}` : '/orders';
            const res = await apiClient.get<any[]>(url, { headers: STAFF_HEADERS });
            return res.data.map((o) => ({
                id: o.id,
                order_number: o.order_number || '',
                table_no: o.table_no,
                customer_name: o.customer_name || 'Khách vãng lai',
                order_type: (o.order_type || 'dine_in').toLowerCase() as any,
                status: (o.status?.toLowerCase() || 'pending') as OrderStatus,
                payment_status: String(o.payment_status || 'unpaid').toLowerCase() as any,
                payment_method: (o.payment_method || 'cash').toLowerCase() as any,
                total_amount: Number(o.total_amount ?? 0),
                items: (o.items || []).map((it: any) => ({
                    id: it.id,
                    name: it.name,
                    quantity: it.quantity,
                    price: Number(it.price || 0),
                    notes: it.notes,
                    status: (it.status?.toLowerCase() || 'pending'),
                    options: (it.options || []).map((opt: any) => ({
                        id: opt.id,
                        option_id: opt.option_id,
                        option_name: opt.option_name,
                        option_type: opt.option_type,
                        price: Number(opt.price || 0),
                    })),
                })),
                created_at: o.created_at,
            }));
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },

    updateStatus: async (orderId: string, status: OrderStatus, autoPay: boolean = false): Promise<void> => {
        try {
            const query = autoPay ? `?status=${status.toLowerCase()}&autoPay=true` : `?status=${status.toLowerCase()}`;
            await apiClient.patch(`/orders/${orderId}/status${query}`, null, { headers: STAFF_HEADERS });
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },

    confirmPayment: async (
        orderId: string,
        paymentMethod?: string,
        amountReceived?: number,
        autoComplete: boolean = false,
        forceConfirm: boolean = false
    ): Promise<void> => {
        try {
            const params = new URLSearchParams();
            if (paymentMethod) params.append('method', paymentMethod.toLowerCase());
            if (amountReceived !== undefined) params.append('amountReceived', amountReceived.toString());
            params.append('autoComplete', autoComplete.toString());
            if (forceConfirm) params.append('forceConfirm', 'true');

            await apiClient.post(`/orders/${orderId}/confirm-payment?${params.toString()}`, null, { headers: STAFF_HEADERS });
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },

    cancelOrderItem: async (
        orderId: string,
        itemId: string,
        reason: string = 'Khách yêu cầu hủy món',
        staffId?: string
    ): Promise<void> => {
        try {
            const params = new URLSearchParams();
            if (reason) params.append('reason', reason);
            const headers: Record<string, string> = { ...STAFF_HEADERS };
            if (staffId) headers['X-Staff-Id'] = staffId;

            await apiClient.post(`/orders/${orderId}/items/${itemId}/cancel?${params.toString()}`, null, { headers });
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },
};