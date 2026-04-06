import api from "../../../../services/api";

export interface SetupSignatory {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export const listSetupSignatories = async (params: { search?: string; department?: string; isActive?: string; page?: number; limit?: number } = {}) => {
  const response = await api.get<PaginatedResponse<SetupSignatory>>('/setup/signatories', { params });
  return response.data;
};

export const createSetupSignatory = async (payload: { name: string; title: string; department: string; email?: string; phone?: string; isActive?: boolean }) => {
  const response = await api.post<{ data: SetupSignatory }>('/setup/signatories', payload);
  return response.data.data;
};

export const updateSetupSignatory = async (id: string, payload: { name?: string; title?: string; department?: string; email?: string; phone?: string; isActive?: boolean }) => {
  const response = await api.put<{ data: SetupSignatory }>(`/setup/signatories/${id}`, payload);
  return response.data.data;
};

export const deleteSetupSignatory = async (id: string) => {
  await api.delete(`/setup/signatories/${id}`);
};

