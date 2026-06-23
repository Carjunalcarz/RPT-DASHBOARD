import api from './api';

export interface BarangayRecord {
  CODE: string;
  DESCRIPTION: string;
  DISTRICT?: string;
  CITY?: string;
  PROV?: string;
  REGION?: string;
}

const BARANGAYS_TTL_MS = 5 * 60 * 1000;
const barangaysCache = new Map<string, { value: { data: BarangayRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }; expiresAt: number }>();
const barangaysInFlight = new Map<string, Promise<{ data: BarangayRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }>>();

export const getBarangays = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  cityCode?: string
): Promise<{ data: BarangayRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }> => {
  const key = JSON.stringify({ page, pageSize, search: search || '', cityCode: cityCode || '' });
  const now = Date.now();
  const cached = barangaysCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = barangaysInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) {
        params.append('search', search);
      }
      if (cityCode) {
        params.append('cityCode', cityCode);
      }
      
      const response = await api.get('/barangays', { params });
      const value = {
        data: response.data.data || [],
        meta: {
          total: response.data.metadata?.total || 0,
          page: response.data.metadata?.page || 1,
          pageSize: response.data.metadata?.pageSize || 20,
          totalPages: response.data.metadata?.totalPages || 1,
        }
      };
      barangaysCache.set(key, { value, expiresAt: Date.now() + BARANGAYS_TTL_MS });
      return value;
    } catch (error) {
      console.error('Failed to fetch barangays:', error);
      return { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 } };
    } finally {
      barangaysInFlight.delete(key);
    }
  })();

  barangaysInFlight.set(key, promise);
  return promise;
};
