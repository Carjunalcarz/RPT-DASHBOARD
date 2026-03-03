import api from './api';

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

export const getClassifications = async (): Promise<Classification[]> => {
  const response = await api.get('/classifications');
  return response.data;
};

export const getActualUses = async (params?: { code?: string; mainClass?: string }): Promise<ActualUse[]> => {
  const response = await api.get('/actual-uses', { params });
  return response.data;
};

export const getSubClasses = async (params?: { code?: string; mainClass?: string; actualUseCode?: string }): Promise<SubClass[]> => {
  const response = await api.get('/subclasses', { params });
  return response.data;
};

export const getTrees = async (): Promise<Tree[]> => {
  const response = await api.get('/trees');
  return response.data;
};
