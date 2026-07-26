export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface TableInfo {
  id: string;
  tableNo: string;
  branchId: string;
  capacity: number;
  status: TableStatus;
  currentOrderAmount?: number;
  occupiedSince?: string;
}

export interface TableRequest {
  tableNo: string;
  branchId: string;
  capacity: number;
}

export interface TableResponse {
  table?: TableInfo;
  tables?: TableInfo[];
}
