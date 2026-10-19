import { apiClient, transformAxiosErrorResponse } from './client';

const STAFF_HEADERS = { 'X-Staff-Key': 'STAFF_SECRET_KEY' };

export interface FileUploadResponse {
  url: string;
  public_id?: string;
  bytes?: number;
  size?: number;
  format?: string;
  storage_provider?: string; // "CLOUDINARY" | "LOCAL_FALLBACK" | "EXTERNAL_FALLBACK"
  storage_type?: string;
  original_filename?: string;
  message?: string;
}

export interface MigrationItemDetail {
  id?: string;
  code?: string;
  name: string;
  original_url: string;
  new_url?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
}

export interface MigrationSummary {
  total_processed: number;
  successful: number;
  failed: number;
  skipped: number;
  message?: string;
  details: MigrationItemDetail[];
}

export const uploadApi = {
  /**
   * Tải ảnh món ăn trực tiếp lên Cloudinary (hoặc local fallback server).
   * Yêu cầu xác thực khóa nhân viên/quản trị viên (X-Staff-Key).
   */
  uploadImage: async (file: File, folder = 'omniresto/dishes'): Promise<FileUploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await apiClient.post<FileUploadResponse>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...STAFF_HEADERS,
        },
      });
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  /**
   * Kích hoạt quét toàn bộ món ăn trong CSDL và đồng bộ các ảnh Unsplash sang Cloudinary vĩnh viễn.
   * Yêu cầu xác thực khóa nhân viên/quản trị viên (X-Staff-Key).
   */
  migrateMenuImages: async (): Promise<MigrationSummary> => {
    try {
      const res = await apiClient.post<MigrationSummary>('/upload/migrate-menu-images', null, {
        headers: STAFF_HEADERS,
      });
      return res.data;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
