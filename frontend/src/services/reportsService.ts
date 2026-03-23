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

export const getPropertyReport = async (filters: { municipality?: string; barangay?: string; taxBegYr?: string; page?: number; limit?: number } = {}) => {
  const response = await api.get<PaginatedResponse<PropertyReport>>('/reports/properties', { params: filters });
  return response.data;
};

export const getReportSummary = async (filters: { municipality?: string; barangay?: string; taxBegYr?: string } = {}) => {
  const response = await api.get<ReportSummary>('/reports/summary', { params: filters });
  return response.data;
};

export const getTaxBegYears = async () => {
  const response = await api.get<string[]>('/reports/tax-beg-years');
  return response.data;
};
