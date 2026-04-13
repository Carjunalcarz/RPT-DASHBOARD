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
    // Disabled: User is now on the new dashboard using RBAC modules
    return { success: true, data: [] };
  },

  getManagementSidebarItems: async () => {
    // Disabled: Replaced by Module Management in the new dashboard
    return { success: true, data: [] };
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
