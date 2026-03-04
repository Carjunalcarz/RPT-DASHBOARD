import api from './api';

export interface FaasRecord {
  id?: string;
  tdn?: string;
  status: 'draft' | 'for-review' | 'approved';
  data: any; // The full form data
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const saveDraft = async (data: any): Promise<FaasRecord> => {
  try {
    const response = await api.post('/faas/draft', data);
    return response.data.data;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};

export const submitForReview = async (id: string): Promise<FaasRecord> => {
  try {
    const response = await api.post(`/faas/${id}/submit`);
    return response.data.data;
  } catch (error) {
    console.error('Error submitting for review:', error);
    throw error;
  }
};

export const getFaasRecord = async (id: string): Promise<FaasRecord> => {
  try {
    const response = await api.get(`/faas/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting FAAS record:', error);
    throw error;
  }
};

export const listFaasRecords = async (params?: { status?: string; page?: number; limit?: number }): Promise<any> => {
  try {
    const response = await api.get('/faas', { params });
    return response.data;
  } catch (error) {
    console.error('Error listing FAAS records:', error);
    throw error;
  }
};