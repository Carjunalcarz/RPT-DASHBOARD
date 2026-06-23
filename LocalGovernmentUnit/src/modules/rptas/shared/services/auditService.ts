import api from "@/modules/rptas/shared/services/api";

export type AuditSource = "mssql" | "supabase";

export interface AuditLog {
  id: number | string;
  tableName: string;
  recordId: string | null;
  action: string;
  userId: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  timestamp: string;
  details?: any;
  oldValues?: any;
  newValues?: any;
}

export interface AuditLogsResponse {
  status: string;
  source: AuditSource;
  results: number;
  total: number;
  page: number;
  totalPages: number;
  data: AuditLog[];
}

export const listAuditLogs = async (params?: {
  source?: AuditSource;
  tableName?: string;
  recordId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogsResponse> => {
  const response = await api.get("/audit", { params });
  return response.data;
};

