import api from "../../../../services/api";

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

export interface FaasTdnHistoryRow {
  id: string;
  tdn: string;
  previousTdn: string | null;
  pin: string | null;
  effectivityDate: string | null;
  ownerCode: string | null;
  declaredOwner: string | null;
  prevMarketValue: number;
  prevAssessedValue: number;
  taxBegYear: number | null;
  isCurrent: boolean;
  changeReason: string;
}

export const getFaasTdnHistory = async (id: string): Promise<FaasTdnHistoryRow[]> => {
  try {
    const response = await api.get(`/faas/${id}/tdn-history`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting TDN history:', error);
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

export const updateFaasStatus = async (id: string, status: 'draft' | 'for-review' | 'approved' | 'rejected' | 'pending-municipal' | 'pending-provincial', remarks?: string): Promise<FaasRecord> => {
  try {
    const response = await api.put(`/faas/${id}/status`, { status, remarks }, { timeout: 60000 });
    return response.data.data;
  } catch (error) {
    console.error('Error updating FAAS status:', error);
    throw error;
  }
};

export const batchUpdateFaasStatus = async (ids: string[], status: 'draft' | 'for-review' | 'approved' | 'rejected' | 'pending-municipal' | 'pending-provincial', remarks?: string): Promise<{ success: string[], failed: { id: string, error: any }[] }> => {
  try {
    const chunkSize = 50;
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      chunks.push(uniqueIds.slice(i, i + chunkSize));
    }

    const aggregate = { success: [] as string[], failed: [] as { id: string, error: any }[] };
    for (const chunk of chunks) {
      const response = await api.post('/faas/batch-status', { ids: chunk, status, remarks }, { timeout: 120000 });
      const result = response.data.data;
      aggregate.success.push(...(result?.success || []));
      aggregate.failed.push(...(result?.failed || []));
    }

    return aggregate;
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};

export const bulkMigrate = async (properties: any[], migrationType: string, skipExisting: boolean = false): Promise<any[]> => {
  try {
    const response = await api.post('/faas/bulk-migrate', 
      { properties, migrationType, skipExisting },
      { timeout: 60000 } // Override default 15s timeout for large batch
    );
    return response.data.data;
  } catch (error) {
    console.error('Error in bulk migration:', error);
    throw error;
  }
};

export const checkExistingTdns = async (tdns: string[]): Promise<string[]> => {
  try {
    const response = await api.post('/faas/check-existing', { tdns });
    return response.data.data;
  } catch (error) {
    console.error('Error checking existing TDNs:', error);
    throw error;
  }
};

export const listFaasRecords = async (params?: { status?: string; page?: number; limit?: number; searchField?: string; filterValue?: string }): Promise<any> => {
  try {
    const response = await api.get('/faas', { params });
    return response.data;
  } catch (error) {
    console.warn('Falling back to empty FAAS list due to API error', error);
    return {
      success: false,
      data: [],
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 100,
        total: 0,
        totalPages: 0
      }
    };
  }
};

export const getDistinctTaxBegYears = async (): Promise<string[]> => {
  try {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    const API_BASE = envUrl ? envUrl.replace('/v1', '') : 'http://localhost:3000/api';
    const response = await api.get('/rptmast/distinct/tax-beg-years', { baseURL: API_BASE });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching distinct tax beginning years:', error);
    return [];
  }
};
