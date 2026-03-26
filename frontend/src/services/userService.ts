import api from './api';

export interface User {
  id: string;
  email: string;
  role: string;
  municipalityCode?: string;
  fullName?: string;
  contactNo?: string;
  createdAt: string;
  lastSignInAt?: string;
}

export interface UserResponse {
  status: string;
  results: number;
  data: {
    users: User[];
  };
}

export interface UpdateUserResponse {
  status: string;
  data: {
    user: User;
  };
}

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<UserResponse>('/users');
    return response.data.data.users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateUser = async (id: string, data: { role?: string; municipalityCode?: string; fullName?: string; contactNo?: string }): Promise<User> => {
  try {
    const response = await api.put<UpdateUserResponse>(`/users/${id}`, data);
    return response.data.data.user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const createUser = async (data: { email: string; password?: string; role?: string; municipalityCode?: string; fullName?: string; contactNo?: string }): Promise<User> => {
  try {
    const response = await api.post<UpdateUserResponse>('/users', data);
    return response.data.data.user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
