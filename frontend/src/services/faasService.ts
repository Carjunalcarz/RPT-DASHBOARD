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

export const saveDraft = async (data: any, id?: string): Promise<FaasRecord> => {
  try {
    let response;
    if (id) {
        // Use PUT for updates if ID is provided (or we could use PATCH)
        response = await api.put(`/faas/${id}`, data);
    } else {
        response = await api.post('/faas/draft', data);
    }
    return response.data.data;
  } catch (error: any) {
    console.error('Error saving draft:', error);
    // Propagate the full error response so the UI can extract the message
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

export const deleteFaasRecord = async (id: string): Promise<void> => {
  try {
    await api.delete(`/faas/${id}`);
  } catch (error) {
    console.error('Error deleting FAAS record:', error);
    throw error;
  }
};

export const cancelFaasTransaction = async (id: string): Promise<void> => {
  try {
    await api.post(`/faas/${id}/cancel-transaction`);
  } catch (error) {
    console.error('Error cancelling FAAS transaction:', error);
    throw error;
  }
};

export const listFaasRecords = async (params?: { status?: string; page?: number; limit?: number; searchField?: string; filterValue?: string }): Promise<any> => {
  try {
    const response = await api.get('/faas', { params });
    return response.data;
  } catch (error) {
    console.error('Error listing FAAS records:', error);
    throw error;
  }
};