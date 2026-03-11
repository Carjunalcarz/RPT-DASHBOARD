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

export const saveDraft = async (data: any, id?: string, idempotencyKey?: string): Promise<FaasRecord> => {
  try {
    const config = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};
    let response;
    // Check if ID is in data if not passed explicitly, for the logic of PUT vs POST
    // But the original code only checked 'id' argument.
    // If the original code relied on 'id' arg to decide PUT/POST, we should keep that behavior.
    // However, looking at RealPropertyDataEntry.tsx, it calls saveDraft(dataToSave).
    // If dataToSave has ID, it should probably be an update.
    // But the original code: if (id) api.put else api.post.
    // So if called as saveDraft(data), it POSTs.
    // Does POST handle updates?
    
    // Let's assume the original code was correct for the current backend.
    // I will just add the config.
    
    if (id) {
        // Use PUT for updates if ID is provided (or we could use PATCH)
        response = await api.put(`/faas/${id}`, data, config);
    } else {
        response = await api.post('/faas/draft', data, config);
    }
    return response.data.data;
  } catch (error: any) {
    console.error('Error saving draft:', error);
    // Propagate the full error response so the UI can extract the message
    throw error;
  }
};

export const submitForReview = async (id: string, idempotencyKey?: string): Promise<FaasRecord> => {
  try {
    const config = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};
    const response = await api.post(`/faas/${id}/submit`, {}, config);
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

export const updateFaasStatus = async (id: string, status: 'draft' | 'for-review' | 'approved' | 'rejected', remarks?: string): Promise<FaasRecord> => {
  try {
    const response = await api.put(`/faas/${id}/status`, { status, remarks });
    return response.data.data;
  } catch (error) {
    console.error('Error updating FAAS status:', error);
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