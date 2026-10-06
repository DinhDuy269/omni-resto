import { apiClient, toQueryString } from './client';
import type { Reservation, ReservationRequest, ReservationStatus } from '../types/reservation';

// ─── Request / Response types ─────────────────────────────────────────────────

/** Query params for GET /api/reservations */
export interface ReservationFilterParams {
  date?: string;         // ISO date: "2025-12-31"
  status?: ReservationStatus;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/** Map backend LocalDate / LocalTime fields (array or string) to string */
function normalizeReservation(raw: Record<string, unknown>): Reservation {
  const reservationDate = Array.isArray(raw.reservationDate)
    ? (raw.reservationDate as number[]).map((n, i) => (i < 2 ? String(n).padStart(2, '0') : String(n).padStart(2, '0'))).join('-')
    : String(raw.reservationDate ?? '');

  const reservationTime = Array.isArray(raw.reservationTime)
    ? (raw.reservationTime as number[]).slice(0, 2).map((n) => String(n).padStart(2, '0')).join(':')
    : String(raw.reservationTime ?? '');

  const createdAt = Array.isArray(raw.createdAt)
    ? new Date(
        ...(raw.createdAt as number[]).map((n, i) => (i === 1 ? n - 1 : n)) as [number, number, number]
      ).toISOString()
    : String(raw.createdAt ?? new Date().toISOString());

  return {
    id: String(raw.id),
    customerName: String(raw.customerName),
    customerPhone: String(raw.customerPhone),
    customerEmail: raw.customerEmail ? String(raw.customerEmail) : undefined,
    partySize: Number(raw.partySize ?? 2),
    reservationDate,
    reservationTime,
    tableNo: raw.tableNo ? String(raw.tableNo) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    status: raw.status as ReservationStatus,
    createdAt,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export const reservationApi = {
  /** GET /api/reservations?branchId=&date=&status= */
  getAll: async (params?: ReservationFilterParams): Promise<Reservation[]> => {
    const query = toQueryString(params as Record<string, unknown>);
    const { data } = await apiClient.get<unknown[]>(`/reservations${query}`);
    return (data as Record<string, unknown>[]).map(normalizeReservation);
  },

  /** GET /api/reservations/:id */
  getById: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.get<Record<string, unknown>>(`/reservations/${id}`);
    return normalizeReservation(data);
  },

  /** POST /api/reservations */
  create: async (request: ReservationRequest): Promise<Reservation> => {
    const { data } = await apiClient.post<Record<string, unknown>>('/reservations', request);
    return normalizeReservation(data);
  },

  /** PATCH /api/reservations/:id/status?status=confirmed */
  updateStatus: async (id: string, status: ReservationStatus): Promise<Reservation> => {
    const { data } = await apiClient.patch<Record<string, unknown>>(
      `/reservations/${id}/status?status=${status}`
    );
    return normalizeReservation(data);
  },

  /** PATCH /api/reservations/:id/table?tableNo=Bàn+05 */
  assignTable: async (id: string, tableNo: string): Promise<Reservation> => {
    const { data } = await apiClient.patch<Record<string, unknown>>(
      `/reservations/${id}/table?tableNo=${encodeURIComponent(tableNo)}`
    );
    return normalizeReservation(data);
  },

  /** DELETE /api/reservations/:id */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/reservations/${id}`);
  },
};
