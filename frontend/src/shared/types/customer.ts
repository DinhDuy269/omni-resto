export interface CustomerRegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  password: string;
  confirmPassword: string;
}

export interface CustomerResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  membershipTier: string;
  loyaltyPoints: number;
  status: string;
  createdAt: string;
}