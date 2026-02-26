import api from './api';
import { AuditLogResponse, AuditLogParams } from '@/types/audit';

export const getAuditLogs = async (params: AuditLogParams): Promise<AuditLogResponse> => {
  const {
    page = 1,
    limit = 10,
    source,
    tableName,
    action,
    userId,
    startDate,
    endDate,
  } = params;

  const response = await api.get<AuditLogResponse>('/audit', {
    params: {
      page,
      limit,
      source,
      tableName: tableName || undefined,
      action: action || undefined,
      userId: userId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
  });

  return response.data;
};

// Export hook-compatible function for SWR if needed, but for now we export the service function.
