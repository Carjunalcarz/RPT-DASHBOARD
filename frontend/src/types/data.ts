export interface Item {
  id: number | string;
  name: string;
  description?: string;
  source: 'mssql' | 'supabase';
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemResponse {
  status: string;
  results?: number;
  data: Item[] | Item;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  source?: 'mssql' | 'supabase';
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskResponse {
  status: string;
  results?: number;
  total?: number;
  page?: number;
  totalPages?: number;
  data: Task[] | Task;
}
