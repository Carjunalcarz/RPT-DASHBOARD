import api from './api';

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  adminOnly: boolean;
  isActive: boolean;
  visibleToUserIds?: string[];
  children?: SidebarItem[];
}

const sidebarService = {
  getSidebarItems: async () => {
    const response = await api.get('/sidebar');
    return response.data;
  },

  getManagementSidebarItems: async () => {
    const response = await api.get('/sidebar/manage');
    return response.data;
  },

  createSidebarItem: async (data: Partial<SidebarItem>) => {
    const response = await api.post('/sidebar', data);
    return response.data;
  },

  updateSidebarItem: async (id: string, data: Partial<SidebarItem>) => {
    const response = await api.patch(`/sidebar/${id}`, data);
    return response.data;
  },

  deleteSidebarItem: async (id: string) => {
    const response = await api.delete(`/sidebar/${id}`);
    return response.data;
  },

  seedSidebarItems: async () => {
    const response = await api.post('/sidebar/seed');
    return response.data;
  }
};

export default sidebarService;
