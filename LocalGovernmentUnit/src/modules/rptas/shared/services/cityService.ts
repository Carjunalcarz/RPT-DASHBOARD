import api from './api';

export interface CityRecord {
  CODE: string;
  DESCRIPTION: string;
  PROV?: string;
  REGION?: string;
}

const CITIES_TTL_MS = 5 * 60 * 1000;
const citiesCache = new Map<string, { value: { data: CityRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }; expiresAt: number }>();
const citiesInFlight = new Map<string, Promise<{ data: CityRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }>>();

export const getCities = async (
  page: number = 1,
  pageSize: number = 100,
  search?: string
): Promise<{ data: CityRecord[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }> => {
  const key = JSON.stringify({ page, pageSize, search: search || '' });
  const now = Date.now();
  const cached = citiesCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = citiesInFlight.get(key);
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
      
      const response = await api.get('/cities', { params });
      const value = {
        data: response.data.data || [],
        meta: {
          total: response.data.metadata?.total || 0,
          page: response.data.metadata?.page || 1,
          pageSize: response.data.metadata?.pageSize || 100,
          totalPages: response.data.metadata?.totalPages || 1,
        }
      };
      citiesCache.set(key, { value, expiresAt: Date.now() + CITIES_TTL_MS });
      return value;
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      return { data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } };
    } finally {
      citiesInFlight.delete(key);
    }
  })();

  citiesInFlight.set(key, promise);
  return promise;
};
