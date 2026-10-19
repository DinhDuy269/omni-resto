import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface OnlineReservationPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  partySize: number;
  reservationTime: string;
  specialNotes?: string;
}

export interface OfflineReservationPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  partySize: number;
  reservationTime: string;
  tableId?: string | null;
  specialNotes?: string | null;
  seatedImmediately?: boolean;
}

export interface AssignTablePayload {
  tableId: string;
}

const RESERVATION_ENDPOINT = '/tables/reservations';

export const reservationApi = {
  // 1. Khách đặt bàn trực tuyến
  createOnline: async (data: OnlineReservationPayload) => {
    const res = await api.post(`${RESERVATION_ENDPOINT}/online`, data);
    return res.data;
  },

  // 2. Nhân viên tạo đơn đặt bàn Offline (Hotline hoặc tại chỗ)
  createOffline: async (data: OfflineReservationPayload) => {
    const res = await api.post(`${RESERVATION_ENDPOINT}/offline`, data);
    return res.data;
  },

  // 3. Lấy danh sách đặt bàn (hỗ trợ lọc query ?status=PENDING, CONFIRMED, ...)
  getAll: async (status: string = '') => {
    const res = await api.get(RESERVATION_ENDPOINT, {
      params: status ? { status } : {},
    });
    return res.data;
  },

  // 4. Tra cứu thông tin đặt bàn qua mã code
  trackByCode: async (code: string) => {
    const res = await api.get(`${RESERVATION_ENDPOINT}/track/${code}`);
    return res.data;
  },

  // 5. Nhân viên gán/xếp bàn cho đơn PENDING
  assignTable: async (reservationId: string, tableId: string) => {
    const res = await api.put(`${RESERVATION_ENDPOINT}/${reservationId}/assign-table`, { tableId });
    return res.data;
  },

  // 6. Khách đến quán nhận bàn (Check-in -> SEATED)
  checkIn: async (reservationId: string) => {
    const res = await api.put(`${RESERVATION_ENDPOINT}/${reservationId}/check-in`);
    return res.data;
  },

  // 7. Hủy đơn đặt bàn kèm lý do
  cancel: async (reservationId: string, reason: string = '') => {
    const res = await api.put(`${RESERVATION_ENDPOINT}/${reservationId}/cancel`, null, {
      params: { reason },
    });
    return res.data;
  },

  // 8. Lấy danh sách sơ đồ bàn (Gọi endpoint do chính bạn cung cấp)
  getTables: async () => {
    const res = await api.get(`${RESERVATION_ENDPOINT}/tables`);
    return res.data;
  },
};

export default reservationApi;