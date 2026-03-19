import api from './api';

export interface SetupSignatoryTemplate {
  id: string;
  year: number;
  description?: string;
  isActive: boolean;
  appraisedById?: string;
  appraisedSgd?: boolean;
  appraisedTpd?: boolean;
  appraisedDate?: string;
  assessedById?: string;
  assessedSgd?: boolean;
  assessedTpd?: boolean;
  assessedDate?: string;
  recommendingById?: string;
  recommendingSgd?: boolean;
  recommendingTpd?: boolean;
  recommendingDate?: string;
  approvedById?: string;
  approvedSgd?: boolean;
  approvedTpd?: boolean;
  approvedDate?: string;
  provincialAssessorId?: string;
  provincialAssessorSgd?: boolean;
  provincialAssessorTpd?: boolean;
  provincialAssessorDate?: string;
  cityAssessorId?: string;
  cityAssessorSgd?: boolean;
  cityAssessorTpd?: boolean;
  cityAssessorDate?: string;
  deputyId?: string;
  deputySgd?: boolean;
  deputyTpd?: boolean;
  deputyDate?: string;
  
  // Relations
  appraisedBy?: { name: string; title: string };
  assessedBy?: { name: string; title: string };
  recommendingBy?: { name: string; title: string };
  approvedBy?: { name: string; title: string };
  provincialAssessor?: { name: string; title: string };
  cityAssessor?: { name: string; title: string };
  deputy?: { name: string; title: string };

  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDTO {
  year: number;
  description?: string;
  isActive?: boolean;
  appraisedById?: string;
  appraisedSgd?: boolean;
  appraisedTpd?: boolean;
  appraisedDate?: string;
  assessedById?: string;
  assessedSgd?: boolean;
  assessedTpd?: boolean;
  assessedDate?: string;
  recommendingById?: string;
  recommendingSgd?: boolean;
  recommendingTpd?: boolean;
  recommendingDate?: string;
  approvedById?: string;
  approvedSgd?: boolean;
  approvedTpd?: boolean;
  approvedDate?: string;
  provincialAssessorId?: string;
  provincialAssessorSgd?: boolean;
  provincialAssessorTpd?: boolean;
  provincialAssessorDate?: string;
  cityAssessorId?: string;
  cityAssessorSgd?: boolean;
  cityAssessorTpd?: boolean;
  cityAssessorDate?: string;
  deputyId?: string;
  deputySgd?: boolean;
  deputyTpd?: boolean;
  deputyDate?: string;
}

export const listTemplates = async () => {
  const response = await api.get('/setup/signatory-templates');
  return response.data;
};

export const getTemplateByYear = async (year: number) => {
  const response = await api.get(`/setup/signatory-templates/year/${year}`);
  return response.data;
};

export const createTemplate = async (data: CreateTemplateDTO) => {
  const response = await api.post('/setup/signatory-templates', data);
  return response.data;
};

export const updateTemplate = async (id: string, data: Partial<CreateTemplateDTO>) => {
  const response = await api.put(`/setup/signatory-templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id: string) => {
  const response = await api.delete(`/setup/signatory-templates/${id}`);
  return response.data;
};
