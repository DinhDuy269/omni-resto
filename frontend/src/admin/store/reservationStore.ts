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
    customerName: 'Nguyễn Thị Lan',
    customerPhone: '0901234567',
    customerEmail: 'lan.nguyen@gmail.com',
    partySize: 4,
    reservationDate: today,
    reservationTime: '18:00',
    tableNo: 'Bàn 05',
    notes: 'Ngồi gần cửa sổ, kỷ niệm sinh nhật',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'rsv-002',
    customerName: 'Trần Văn Hùng',
    customerPhone: '0912888999',
    partySize: 2,
    reservationDate: today,
    reservationTime: '19:30',
    status: 'pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'rsv-003',
    customerName: 'Lê Thị Phương',
    customerPhone: '0988555444',
    customerEmail: 'phuong.le@yahoo.com',
    partySize: 6,
    reservationDate: today,
    reservationTime: '20:00',
    notes: 'Tiệc công ty, cần phòng riêng',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'rsv-004',
    customerName: 'Phạm Minh Đức',
    customerPhone: '0933111222',
    partySize: 3,
    reservationDate: tomorrow,
    reservationTime: '12:00',
    status: 'pending',
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'rsv-005',
    customerName: 'Hoàng Anh Tú',
    customerPhone: '0977333666',
    partySize: 8,
    reservationDate: today,
    reservationTime: '18:30',
    tableNo: 'Bàn 10',
    status: 'seated',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'rsv-006',
    customerName: 'Nguyễn Anh Khữu',
    customerPhone: '0911222333',
    customerEmail: 'khuu@gmail.com',
    partySize: 5,
    reservationDate: nextWeek,
    reservationTime: '19:00',
    notes: 'Kỷ niệm ngày cưới',
    status: 'pending',
    createdAt: new Date(Date.now() - 600000).toISOString(),
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
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          partySize: data.partySize,
          reservationDate: data.reservationDate,
          reservationTime: data.reservationTime,
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
      createdAt: new Date().toISOString(),
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
