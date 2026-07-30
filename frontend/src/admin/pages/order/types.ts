import type { OrderStatus } from '../../../shared/types/admin';

export interface OrderFilterParams {
  branchId?: string;
  status?: OrderStatus;
  search?: string;
}
