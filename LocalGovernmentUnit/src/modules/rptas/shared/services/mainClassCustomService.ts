import api from './api';

export interface CustomMainClass {
  id: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const CUSTOM_MAIN_CLASSES_TTL_MS = 5 * 60 * 1000;
const customMainClassesCache = new Map<string, { value: CustomMainClass[]; expiresAt: number }>();
const customMainClassesInFlight = new Map<string, Promise<CustomMainClass[]>>();

export const getCustomMainClasses = async (params?: { search?: string }): Promise<CustomMainClass[]> => {
  const key = JSON.stringify(params ?? {});
  const now = Date.now();
  const cached = customMainClassesCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = customMainClassesInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const response = await api.get('/classifications/custom', { params });
    const value = (response.data.data || []) as CustomMainClass[];
    customMainClassesCache.set(key, { value, expiresAt: Date.now() + CUSTOM_MAIN_CLASSES_TTL_MS });
    return value;
  })().finally(() => {
    customMainClassesInFlight.delete(key);
  });

  customMainClassesInFlight.set(key, promise);
  return promise;
};

export const upsertCustomMainClass = async (code: string, description: string): Promise<CustomMainClass> => {
  const response = await api.post('/classifications/custom', { code, description });
  return response.data.data;
};

export const deleteCustomMainClass = async (code: string): Promise<void> => {
  await api.delete(`/classifications/custom/${encodeURIComponent(code)}`);
};
