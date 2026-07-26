import type { OrderStatus } from '../../types/admin';

export interface OrderFilterParams {
  branchId?: string;
  status?: OrderStatus;
  search?: string;
}
