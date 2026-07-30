import { apiClient, transformAxiosErrorResponse } from '../../../shared/api/client';
import type { Branch, BranchResponse, BranchStatus } from '../../../shared/types/admin';

export const branchApi = {
  getBranches: async (): Promise<Branch[]> => {
    try {
      const res = await apiClient.get<Branch[] | BranchResponse>('/branches');
      if (Array.isArray(res.data)) return res.data;
      return res.data.branches || [];
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  getBranch: async (id: string): Promise<Branch> => {
    try {
      const res = await apiClient.get<Branch | BranchResponse>(`/branches/${id}`);
      if ('branch' in res.data && res.data.branch) return res.data.branch;
      return res.data as Branch;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  createBranch: async (request: Partial<Branch>): Promise<Branch> => {
    try {
      const res = await apiClient.post<Branch | BranchResponse>('/branches', {
        branch: request,
      });
      if ('branch' in res.data && res.data.branch) return res.data.branch;
      return res.data as Branch;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },

  updateBranchStatus: async (id: string, status: BranchStatus): Promise<Branch> => {
    try {
      const res = await apiClient.patch<Branch | BranchResponse>(`/branches/${id}/status`, null, { params: { status } });
      if ('branch' in res.data && res.data.branch) return res.data.branch;
      return res.data as Branch;
    } catch (error) {
      throw transformAxiosErrorResponse(error);
    }
  },
};
