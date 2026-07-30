import type { TableStatus } from '../../../shared/types/admin';

export interface TableFilterParams {
  branchId: string;
  status?: TableStatus;
}
