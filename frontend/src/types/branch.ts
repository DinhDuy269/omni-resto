export type BranchStatus = 'active' | 'maintenance' | 'closed' | 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  managerName: string;
  status: BranchStatus;
  tablesCount: number;
  activeOrdersCount: number;
  dailyRevenue: number;
  rating: number;
}

export interface BranchRequest {
  code: string;
  name: string;
  address: string;
  phone: string;
  managerName: string;
  tablesCount?: number;
}

export interface BranchResponse {
  branch?: Branch;
  branches?: Branch[];
}
