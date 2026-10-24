import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Staff-Key': 'STAFF_SECRET_KEY',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ClientError {
  status: number;
  error: string;
  error_description?: string;
  data?: unknown;
}

export const parseErrorBody = (status: number, data: unknown): ClientError => {
  if (typeof data === 'object' && data !== null) {
    const errObj = data as Record<string, unknown>;
    return {
      status,
      error: String(errObj.error || errObj.message || 'api_error'),
      error_description: String(errObj.error_description || errObj.message || 'An error occurred'),
      data,
    };
  }
  return {
    status,
    error: 'http_error',
    error_description: String(data || 'Request failed'),
  };
};

export const transformAxiosErrorResponse = (error: AxiosError | unknown): ClientError => {
  if (axios.isAxiosError(error) && error.response) {
    return parseErrorBody(error.response.status, error.response.data);
  }
  const errMessage = error instanceof Error ? error.message : 'Network connection failed';
  return {
    status: 500,
    error: 'network_error',
    error_description: errMessage,
  };
};

export const toQueryString = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const cleanParams: Record<string, string> = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = String(val);
    }
  });
  const queryString = new URLSearchParams(cleanParams).toString();
  return queryString ? `?${queryString}` : '';
};

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/menu-items', { timeout: 3000 });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
};
