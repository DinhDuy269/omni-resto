import type { TableStatus } from '../../types/admin';

export interface TableFilterParams {
  branchId: string;
  status?: TableStatus;
}
