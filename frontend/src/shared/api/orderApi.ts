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
                order_type: o.order_type || 'DINE_IN',
                status: (o.status?.toUpperCase() || 'PENDING') as OrderStatus,
                payment_status: o.payment_status || 'UNPAID',
                payment_method: o.payment_method || 'CASH',
                total_amount: Number(o.total_amount ?? 0),
                items: (o.items || []).map((it: any) => ({
                    id: it.id,
                    name: it.name,
                    quantity: it.quantity,
                    price: Number(it.price || 0),
                    notes: it.notes,
                    status: it.status?.toUpperCase() || 'PENDING',
                })),
                created_at: o.created_at,
            }));
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },

    updateStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
        try {
            await apiClient.patch(`/orders/${orderId}/status?status=${status.toLowerCase()}`, null, { headers: STAFF_HEADERS });
        } catch (error) {
            throw transformAxiosErrorResponse(error);
        }
    },
};