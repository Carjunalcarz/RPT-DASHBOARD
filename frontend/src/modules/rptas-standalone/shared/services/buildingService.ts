import api from "../../../../services/api";

export interface BuildingType {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface BuildingMarketValue {
  id: string;
  ordinanceNo: string;
  effectivityDate: string;
  buildingTypeId: string;
  structureClass: string; // e.g., 'V', 'IV', 'III'
  subClass?: string;      // e.g., 'A', 'B'
  unitValue: number;
  buildingType?: BuildingType;
}

export interface BuildingAppraisal {
  id: string;
  classification: string;
  classificationCode: string;
  buildingType: string;      // Structure Class
  buildingSubClass?: string; // Sub Class
  rate: number;              // Unit Value
}

const BUILDING_TYPES_TTL_MS = 5 * 60 * 1000;
let buildingTypesCache: { value: BuildingType[]; expiresAt: number } | null = null;
let buildingTypesInFlight: Promise<BuildingType[]> | null = null;

export const invalidateBuildingTypesCache = () => {
  buildingTypesCache = null;
};

export const getBuildingTypes = async (): Promise<BuildingType[]> => {
  const now = Date.now();
  if (buildingTypesCache && buildingTypesCache.expiresAt > now) {
    return buildingTypesCache.value;
  }

  if (buildingTypesInFlight) {
    return buildingTypesInFlight;
  }

  buildingTypesInFlight = (async () => {
    try {
      const response = await api.get('/buildings/types');
      const types =
        response.data && response.data.success ? (response.data.data as BuildingType[]) : [];
      if (response.data && response.data.success) {
        buildingTypesCache = { value: types, expiresAt: Date.now() + BUILDING_TYPES_TTL_MS };
      }
      return types;
    } catch (error) {
      console.error('Error fetching building types:', error);
      return [];
    } finally {
      buildingTypesInFlight = null;
    }
  })();

  return buildingTypesInFlight;
};

export const getBuildingMarketValues = async (params?: {
  buildingTypeId?: string;
  buildingTypeCode?: string;
  ordinanceNo?: string;
}): Promise<BuildingMarketValue[]> => {
  try {
    const response = await api.get('/buildings/market-values', { 
      params: { 
        limit: 1000, 
        ...params 
      } 
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching building market values:', error);
    return [];
  }
};

export const getBuildingAppraisals = async (params?: {
  classificationCode?: string;
  buildingType?: string;
  buildingSubClass?: string;
}): Promise<BuildingAppraisal[]> => {
  try {
    const response = await api.get('/building-appraisals', { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching building appraisals:', error);
    return [];
  }
};

export const getBuildingAppraisalClassifications = async (): Promise<any[]> => {
  try {
    const response = await api.get('/building-appraisals/classifications');
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching building appraisal classifications:', error);
    return [];
  }
};

export const createBuildingAppraisal = async (data: Partial<BuildingAppraisal>): Promise<BuildingAppraisal | null> => {
  try {
    const response = await api.post('/building-appraisals', data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Error creating building appraisal:', error);
    throw error;
  }
};

export const updateBuildingAppraisal = async (id: string, data: Partial<BuildingAppraisal>): Promise<BuildingAppraisal | null> => {
  try {
    const response = await api.put(`/building-appraisals/${id}`, data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Error updating building appraisal:', error);
    throw error;
  }
};

export const deleteBuildingAppraisal = async (id: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/building-appraisals/${id}`);
    if (response.data && response.data.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting building appraisal:', error);
    throw error;
  }
};
