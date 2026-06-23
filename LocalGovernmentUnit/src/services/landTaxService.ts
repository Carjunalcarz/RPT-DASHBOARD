import api from '@/modules/rptas/shared/services/api';

export interface LandClassification {
  code: string;
  description: string;
  name?: string;
}

export interface LandMarketValue {
  code: string;
  description: string;
  classLevel?: string;
  rate?: number;
}

export interface Municipality {
  code: string;
  name: string;
}

const MUNICIPALITIES_TTL_MS = 5 * 60 * 1000;
let municipalitiesCache: { value: Municipality[]; expiresAt: number } | null = null;
let municipalitiesInFlight: Promise<Municipality[]> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMunicipalityRow = (value: unknown): value is { code: string; name: string } =>
  isRecord(value) && typeof value.code === 'string' && typeof value.name === 'string';

const isCityRow = (value: unknown): value is { CODE: string; DESCRIPTION: string } =>
  isRecord(value) && typeof value.CODE === 'string' && typeof value.DESCRIPTION === 'string';

export const getLandClassifications = async (): Promise<LandClassification[]> => {
  return [];
};

export const getLandMarketValues = async (_params?: unknown): Promise<LandMarketValue[]> => {
  return [];
};

export const getMunicipalities = async (): Promise<Municipality[]> => {
  const now = Date.now();
  if (municipalitiesCache && municipalitiesCache.expiresAt > now) {
    return municipalitiesCache.value;
  }
  if (municipalitiesInFlight) return municipalitiesInFlight;

  municipalitiesInFlight = (async () => {
    try {
      try {
        const response = await api.get('/land-tax/municipalities', { timeout: 30000 });
        const raw = response?.data;
        const list: unknown[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { data?: unknown })?.data)
            ? ((raw as { data: unknown[] }).data as unknown[])
            : [];

        const parsed = list
          .filter(isMunicipalityRow)
          .map((r) => ({ code: r.code.trim(), name: r.name.trim() }))
          .filter((r) => r.code && r.name);
        if (parsed.length > 0) {
          municipalitiesCache = { value: parsed, expiresAt: Date.now() + MUNICIPALITIES_TTL_MS };
          return parsed;
        }
      } catch (error) {
        console.error('Failed to fetch land-tax municipalities:', error);
      }

      try {
        const response = await api.get('/cities', {
          params: { page: 1, pageSize: 1000 },
          timeout: 30000,
        });
        const raw = response?.data?.data;
        if (!Array.isArray(raw)) return [];

        const parsed = (raw as unknown[])
          .filter(isCityRow)
          .map((r) => ({ code: r.CODE.trim(), name: r.DESCRIPTION.trim() }))
          .filter((r) => r.code && r.name);
        municipalitiesCache = { value: parsed, expiresAt: Date.now() + MUNICIPALITIES_TTL_MS };
        return parsed;
      } catch {
        return [];
      }
    } finally {
      municipalitiesInFlight = null;
    }
  })();

  return municipalitiesInFlight;
};

export const getAgriculturalTypes = async (): Promise<any[]> => {
  return [];
};
