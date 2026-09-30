import type { OrderStatus } from '../../../shared/types/admin';

export interface OrderFilterParams {
  status?: OrderStatus;
  search?: string;
}
