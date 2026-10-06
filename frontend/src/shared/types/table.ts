export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface TableInfo {
  id: string;
  tableNo: string;
  capacity: number;
  status: TableStatus;
  currentOrderAmount?: number;
  occupiedSince?: string;
  qrSecretToken?: string;
  isVerified?: boolean;
  paymentRequested?: boolean;
  isPaid?: boolean;
  activeOrderNumber?: string;
  activeSessionToken?: string;
}

export interface TableRequest {
  tableNo: string;
  capacity: number;
}

export interface TableResponse {
  table?: TableInfo;
  tables?: TableInfo[];
}
