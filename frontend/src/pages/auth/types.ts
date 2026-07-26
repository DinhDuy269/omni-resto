import type { RoleType } from '../../types/admin';

export interface UserFormData {
  fullName: string;
  email: string;
  phone: string;
  role: RoleType;
  branchId: string;
}
