import { create } from 'zustand';
import type { Reservation, ReservationStatus } from '../../shared/types/reservation';
import { reservationApi } from '../../shared/api/reservation';

// ─── Seed data — mock fallback when backend is offline ────────────────────────
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'rsv-001',
    customer_name: 'Nguyễn Thị Lan',
    customer_phone: '0901234567',
    customer_email: 'lan.nguyen@gmail.com',
    party_size: 4,
    reservation_date: today,
    reservation_time: '18:00',
    table_no: 'Bàn 05',
    notes: 'Ngồi gần cửa sổ, kỷ niệm sinh nhật',
    status: 'confirmed',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'rsv-002',
    customer_name: 'Trần Văn Hùng',
    customer_phone: '0912888999',
    party_size: 2,
    reservation_date: today,
    reservation_time: '19:30',
    status: 'pending',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'rsv-003',
    customer_name: 'Lê Thị Phương',
    customer_phone: '0988555444',
    customer_email: 'phuong.le@yahoo.com',
    party_size: 6,
    reservation_date: today,
    reservation_time: '20:00',
    notes: 'Tiệc công ty, cần phòng riêng',
    status: 'confirmed',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'rsv-004',
    customer_name: 'Phạm Minh Đức',
    customer_phone: '0933111222',
    party_size: 3,
    reservation_date: tomorrow,
    reservation_time: '12:00',
    status: 'pending',
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'rsv-005',
    customer_name: 'Hoàng Anh Tú',
    customer_phone: '0977333666',
    party_size: 8,
    reservation_date: today,
    reservation_time: '18:30',
    table_no: 'Bàn 10',
    status: 'seated',
    created_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'rsv-006',
    customer_name: 'Nguyễn Anh Khữu',
    customer_phone: '0911222333',
    customer_email: 'khuu@gmail.com',
    party_size: 5,
    reservation_date: nextWeek,
    reservation_time: '19:00',
    notes: 'Kỷ niệm ngày cưới',
    status: 'pending',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
];

// ─── Store interface ─────────────────────────────────────────────────────────

interface ReservationState {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  isApiMode: boolean;

  // Initialize: try backend, fallback to mock
  initialize: () => Promise<void>;
  // Bulk setter (for API sync)
  setReservations: (reservations: Reservation[]) => void;

  // Actions — automatically sync to API when in API mode
  addReservation: (data: Omit<Reservation, 'id' | 'createdAt'>) => Promise<Reservation>;
  updateReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;
  assignTable: (id: string, tableNo: string) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReservationStore = create<ReservationState>((set, get) => ({
  reservations: MOCK_RESERVATIONS,
  loading: false,
  error: null,
  isApiMode: false,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const data = await reservationApi.getAll();
      set({ reservations: data, isApiMode: true, loading: false });
    } catch {
      // Offline / API error — use mock data
      set({ reservations: MOCK_RESERVATIONS, isApiMode: false, loading: false });
    }
  },

  setReservations: (reservations) => set({ reservations }),

  addReservation: async (data) => {
    const { isApiMode } = get();
    if (isApiMode) {
      try {
        const created = await reservationApi.create({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          party_size: data.party_size,
          reservation_date: data.reservation_date,
          reservation_time: data.reservation_time,
          notes: data.notes,
        });
        set((state) => ({ reservations: [created, ...state.reservations] }));
        return created;
      } catch (err) {
        console.error('[ReservationStore] addReservation API error:', err);
        // Fallthrough to local mock
      }
    }
    // Mock mode
    const newReservation: Reservation = {
      ...data,
      id: `rsv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ reservations: [newReservation, ...state.reservations] }));
    return newReservation;
  },

  updateReservationStatus: async (id, status) => {
    const { isApiMode } = get();
    // Optimistic update
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    }));
    if (isApiMode) {
      try {
        const updated = await reservationApi.updateStatus(id, status);
        // Sync with server response
        set((state) => ({
          reservations: state.reservations.map((r) => (r.id === id ? updated : r)),
        }));
      } catch (err) {
        console.error('[ReservationStore] updateStatus API error:', err);
      }
    }
  },

  assignTable: async (id, tableNo) => {
    const { isApiMode } = get();
    // Optimistic update
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, tableNo } : r
      ),
    }));
    if (isApiMode) {
      try {
        const updated = await reservationApi.assignTable(id, tableNo);
        set((state) => ({
          reservations: state.reservations.map((r) => (r.id === id ? updated : r)),
        }));
      } catch (err) {
        console.error('[ReservationStore] assignTable API error:', err);
      }
    }
  },

  deleteReservation: async (id) => {
    const { isApiMode } = get();
    // Optimistic remove
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
    }));
    if (isApiMode) {
      try {
        await reservationApi.delete(id);
      } catch (err) {
        console.error('[ReservationStore] deleteReservation API error:', err);
      }
    }
  },
}));
