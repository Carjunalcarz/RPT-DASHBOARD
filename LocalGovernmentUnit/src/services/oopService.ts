import api from '@/modules/rptas/shared/services/api';

export const getOOPs = async (params?: any) => {
  const res = await api.get('/oop', { params });
  return res.data;
};

export const getOOPById = async (id: string) => {
  const res = await api.get(`/oop/${id}`);
  return res.data;
};

export const listPending = async (params?: any) => {
  const res = await api.get('/oop/pending', { params });
  return res.data;
};

export const markPaid = async (id: string, approvedBy?: string, paymentMethod?: string) => {
  const body: Record<string, string> = {};
  if (approvedBy) body.approvedBy = approvedBy;
  if (paymentMethod) body.paymentMethod = paymentMethod;
  const res = await api.post(`/oop/${id}/pay`, body);
  return res.data;
};

export const getHistory = async (id: string) => {
  const res = await api.get(`/oop/${id}/history`);
  return res.data;
};

export const create = async (data: any) => {
  const res = await api.post('/oop', data);
  return res.data;
};

export const search = async (q: string) => {
  const res = await api.get('/oop/search', { params: { q } });
  return res.data;
};

export const get = async (id: string) => {
  const res = await api.get(`/oop/${id}`);
  return res.data;
};

export default {
  getOOPs,
  getOOPById,
  listPending,
  markPaid,
  getHistory,
  create,
  search,
  get
};
