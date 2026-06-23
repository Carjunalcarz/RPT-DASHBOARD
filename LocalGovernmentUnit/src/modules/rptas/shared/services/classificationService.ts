import api from '@/modules/rptas/shared/services/api';

export interface Classification {
  Code: string;
  Description: string;
  OrderKey?: number;
  Grp?: string;
}

export interface ActualUse {
  REGION: string;
  PROV: string;
  CITY: string;
  MainClass: string;
  Code: string;
  Description: string;
  MValue?: number;
  ForSelection?: number;
  Grp?: string;
}

export interface SubClass {
  REGION: string;
  PROV: string;
  CITY: string;
  MainClass: string;
  Code: string;
  Description: string;
}

export interface Tree {
  Code: string;
  Description: string;
}

const CLASSIFICATIONS_TTL_MS = 5 * 60 * 1000;
let classificationsCache: { value: Classification[]; expiresAt: number } | null = null;
let classificationsInFlight: Promise<Classification[]> | null = null;

export const getClassifications = async (): Promise<Classification[]> => {
  const now = Date.now();
  if (classificationsCache && classificationsCache.expiresAt > now) {
    return classificationsCache.value;
  }
  if (classificationsInFlight) return classificationsInFlight;

  classificationsInFlight = (async () => {
    const response = await api.get('/classifications');
    const rawData = response.data?.data || response.data || [];
    const value = rawData.map((item: any) => ({
      Code: item.Code || item.code,
      Description: item.Description || item.description,
      OrderKey: item.OrderKey || item.orderKey,
      Grp: item.Grp || item.grp
    }));
    classificationsCache = { value, expiresAt: Date.now() + CLASSIFICATIONS_TTL_MS };
    return value;
  })().finally(() => {
    classificationsInFlight = null;
  });

  return classificationsInFlight;
};

export const getActualUses = async (params?: { code?: string; mainClass?: string; page?: number; pageSize?: number; search?: string }): Promise<ActualUse[]> => {
  const response = await api.get('/actual-uses', { params });
  // Handle both new paginated response structure ({ data: [...] }) and legacy direct array structure
  const rawData = response.data?.data || response.data || [];
  
  // Map Prisma-style camelCase keys to MSSQL PascalCase keys for the frontend
  return rawData.map((item: any) => ({
    REGION: item.REGION || item.region,
    PROV: item.PROV || item.prov,
    CITY: item.CITY || item.city,
    MainClass: item.MainClass || item.mainClass,
    Code: item.Code || item.code,
    Description: item.Description || item.description,
    MValue: item.MValue || item.mValue,
    ForSelection: item.ForSelection || item.forSelection,
    Grp: item.Grp || item.grp
  }));
};

export const getSubClasses = async (params?: { code?: string; mainClass?: string; actualUseCode?: string }): Promise<SubClass[]> => {
  const response = await api.get('/subclasses', { params });
  return response.data;
};

export const getTrees = async (): Promise<Tree[]> => {
  const response = await api.get('/trees');
  return response.data;
};
