export interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'create' | 'update' | 'delete';
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: string;
  details?: any;
  oldValues?: any;
  newValues?: any;
}

export interface AuditLogResponse {
  status: string;
  source: string;
  results: number;
  total: number;
  page: number;
  totalPages: number;
  data: AuditLog[];
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  source?: 'mssql' | 'supabase';
  tableName?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}
