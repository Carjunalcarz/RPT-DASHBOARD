import api from './api';

export interface PropertyReport {
  assessmentId: string;
  kind: string;
  assLevel: number;
  taxability: string;
  classification: string;
  subclass: string;
  area: number;
  measurement: string;
  marketValue: number;
  assValue: number;
  propertyId: string;
  pin: string;
  tdn: string;
  ownerName: string;
  municipality: string;
  barangay: string;
  muncode: string;
  bcode: string;
  taxBegYr: string;
  transCode: string;
  taxYear: string;
  paymentStatus?: 'unpaid' | 'pending' | 'paid';
}

export interface ReportSummary {
  totalProperties: number;
  totalMarketValue: number;
  totalAssessedValue: number;
  approvedFaasCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TreasuryPaymentExportRow {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDescription: string | null;
  orderCreatedBy: string | null;
  orderCreatedAt: string | null;
  paidAt: string;
  paidBy: string;
  orderAmount: number | null;
  propertyId: string;
  pin: string | null;
  tdn: string | null;
  taxBegYr: string | null;
  municipalityCode: string | null;
  municipalityName: string | null;
  barangayCode: string | null;
  barangayName: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  totalMarketValue: number;
  totalAssessedValue: number;
  validationErrors: string[];
  createdAt: string;
  updatedAt: string;
}

const buildParams = (input: Record<string, unknown>) => {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) continue;
      params[k] = s;
      continue;
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue;
      params[k] = v;
      continue;
    }
  }
  return params;
};

export const getPropertyReport = async (filters: { municipality?: string; barangay?: string; taxBegYr?: string; page?: number; limit?: number } = {}) => {
  const response = await api.get<PaginatedResponse<PropertyReport>>('/reports/properties', { params: buildParams(filters as any) });
  return response.data;
};

export const getReportSummary = async (filters: { municipality?: string; barangay?: string; taxBegYr?: string } = {}) => {
  const response = await api.get<ReportSummary>('/reports/summary', { params: buildParams(filters as any) });
  return response.data;
};

export const getTaxBegYears = async () => {
  const response = await api.get<string[]>('/reports/tax-beg-years');
  return response.data;
};

export const getTreasuryPaymentsReport = async (
  filters: {
    from?: string;
    to?: string;
    orderNumber?: string;
    tdn?: string;
    ownerName?: string;
    municipalityCode?: string;
    barangayCode?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const response = await api.get<PaginatedResponse<TreasuryPaymentExportRow>>('/reports/treasury-payments', { params: filters });
  return response.data;
};
