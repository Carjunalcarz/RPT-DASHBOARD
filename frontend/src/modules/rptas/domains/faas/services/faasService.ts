// Define services here matching the DI structure

export const getFaasRecords = async (params: any) => {
  // In real app: return apiClient.get('/api/v2/faas', { params });
  return [];
};

export const submitFaasForValidation = async (id: string) => {
  // In real app: return apiClient.post(`/api/v2/faas/${id}/submit`);
  return { success: true };
};
