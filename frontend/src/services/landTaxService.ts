import api from './api';

export interface LandClassification {
  id: number;
  code: string;
  name: string;
  category: string;
}

export interface LandSubClass {
  id: number;
  code: string;
  name: string;
  classificationId: number;
  classification?: LandClassification;
}

export interface LandMarketValue {
  id: number;
  municipalityId: number;
  subClassId: number;
  classLevel: string;
  rate: number;
  unit: string;
  ordinanceNo: string;
  effectivityDate: string;
  municipality?: {
    id: number;
    code: string;
    name: string;
  };
  subClass?: LandSubClass;
}

export interface Municipality {
  id: number;
  code: string;
  name: string;
}

export const getLandClassifications = async (): Promise<LandClassification[]> => {
  const response = await api.get('/land-tax/classifications');
  return response.data;
};

export const getLandSubClasses = async (classificationCode?: string): Promise<LandSubClass[]> => {
  const params = classificationCode ? { classificationCode } : {};
  const response = await api.get('/land-tax/subclasses', { params });
  return response.data;
};

export const getLandMarketValues = async (params: {
  municipalityName?: string;
  subClassCode?: string;
  classificationCode?: string;
}): Promise<LandMarketValue[]> => {
  const response = await api.get('/land-tax/market-values', { params });
  return response.data;
};

export const getMunicipalities = async (): Promise<Municipality[]> => {
  const response = await api.get('/land-tax/municipalities');
  return response.data;
};

export const getAgriculturalTypes = async (): Promise<{ code: string; name: string }[]> => {
  const response = await api.get('/land-tax/agricultural-types');
  return response.data;
};
