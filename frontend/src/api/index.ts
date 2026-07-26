export * from './client';

// Common API Response & Request Interfaces
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: number;
}

export interface ApiErrorResponse {
  error: string;
  error_description?: string;
  status?: number;
}

export interface BaseFilterRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
