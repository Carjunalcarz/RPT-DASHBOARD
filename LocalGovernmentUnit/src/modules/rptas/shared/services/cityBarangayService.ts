import api from './api';

export interface AssignedBarangay {
  code: string;
  name: string;
}

export interface CityBarangayAssignment {
  id: string;
  city_code: string;
  city_name: string;
  barangays: AssignedBarangay[]; 
  created_at: string;
  updated_at: string;
}

export const getCityBarangayAssignments = async (): Promise<CityBarangayAssignment[]> => {
  const response = await api.get('/city-barangay-assignments');
  return response.data.data || [];
};

export const getAssignmentByCityCode = async (cityCode: string): Promise<CityBarangayAssignment | null> => {
  try {
    const response = await api.get(`/city-barangay-assignments/${cityCode}`);
    return response.data.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

export const upsertCityBarangayAssignment = async (
  cityCode: string,
  cityName: string,
  barangays: AssignedBarangay[]
): Promise<CityBarangayAssignment> => {
  const response = await api.post('/city-barangay-assignments', {
    cityCode,
    cityName,
    barangays
  });
  return response.data.data;
};

export const deleteCityBarangayAssignment = async (id: string): Promise<void> => {
  await api.delete(`/city-barangay-assignments/${id}`);
};