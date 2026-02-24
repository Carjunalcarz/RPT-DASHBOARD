import api from './api';
import { Item, ItemResponse, Task, TaskResponse } from '@/types/data';

// --- Items Service ---

export const getItems = async (source?: string): Promise<Item[]> => {
  const response = await api.get<ItemResponse>('/items', {
    params: { source }
  });
  return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
};

export const createItem = async (data: Partial<Item>): Promise<Item> => {
  const response = await api.post<ItemResponse>('/items', data);
  return response.data.data as Item;
};

export const updateItem = async (id: number | string, data: Partial<Item>): Promise<Item> => {
  const response = await api.put<ItemResponse>(`/items/${id}`, data);
  return response.data.data as Item;
};

export const deleteItem = async (id: number | string, source: string): Promise<void> => {
  await api.delete(`/items/${id}`, {
    params: { source }
  });
};

// --- Tasks Service ---

export const getTasks = async (params?: any): Promise<TaskResponse> => {
  const response = await api.get<TaskResponse>('/test-tasks', {
    params
  });
  return response.data;
};

export const createTask = async (data: Partial<Task>): Promise<Task> => {
  const response = await api.post<TaskResponse>('/test-tasks', data);
  return response.data.data as Task;
};

export const updateTask = async (id: number, data: Partial<Task>): Promise<Task> => {
  const response = await api.patch<TaskResponse>(`/test-tasks/${id}`, data);
  return response.data.data as Task;
};

export const deleteTask = async (id: number, source: string): Promise<void> => {
  await api.delete(`/test-tasks/${id}`, {
    params: { source }
  });
};
