export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface Reservation {
  id: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: string; // ISO date: "2025-12-31"
  reservationTime: string; // "18:30"
  tableNo?: string;
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface ReservationRequest {
  branchId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  notes?: string;
}
