import api from './api';

export interface AssignedActualUse {
  code: string;
  name: string;
}

export interface MainclassActualUseAssignment {
  id: string;
  municipality_code: string;
  class_level: string;
  ordinance_no?: string | null;
  date_approved?: string | null;
  mainclass_code: string;
  mainclass_name: string;
  actual_uses: AssignedActualUse[]; 
  created_at: string;
  updated_at: string;
}

export const getMainclassActualUseAssignments = async (params: { municipalityCode: string; classLevel: string; ordinanceNo?: string }): Promise<MainclassActualUseAssignment[]> => {
  const response = await api.get('/mainclass-actualuse-assignments', { params });
  return response.data.data || [];
};

export const getAssignmentByMainClass = async (
  params: { municipalityCode: string; classLevel: string; mainClassCode: string; ordinanceNo?: string }
): Promise<MainclassActualUseAssignment | null> => {
  try {
    const response = await api.get(`/mainclass-actualuse-assignments/${params.mainClassCode}`, { params });
    return response.data.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

export const upsertMainclassActualUseAssignment = async (
  municipalityCode: string,
  classLevel: string,
  ordinanceNo: string,
  dateApproved: string,
  mainClassCode: string,
  mainClassName: string,
  actualUses: AssignedActualUse[]
): Promise<MainclassActualUseAssignment> => {
  const response = await api.post('/mainclass-actualuse-assignments', {
    municipalityCode,
    classLevel,
    ordinanceNo,
    dateApproved,
    mainClassCode,
    mainClassName,
    actualUses
  });
  return response.data.data;
};

export const deleteMainclassActualUseAssignment = async (id: string): Promise<void> => {
  await api.delete(`/mainclass-actualuse-assignments/${id}`);
};
