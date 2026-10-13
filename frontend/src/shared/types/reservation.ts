export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string; // ISO date: "2025-12-31"
  reservation_time: string; // "18:30"
  table_no?: string;
  notes?: string;
  status: ReservationStatus;
  created_at: string;
}

export interface ReservationRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  notes?: string;
}
