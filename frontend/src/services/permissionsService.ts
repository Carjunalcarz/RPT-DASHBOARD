import api from './api';

export type PermissionAccessReason = 'admin' | 'public' | 'assigned' | 'none';

export interface PermissionNode {
  id: string;
  label: string;
  path: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  adminOnly: boolean;
  isActive: boolean;
  access: {
    allowed: boolean;
    reason: PermissionAccessReason;
    allowlistCount: number;
    allowlistedForUser: boolean;
    accessLevel: string;
  };
  children?: PermissionNode[];
}

export interface MyPermissionsResponse {
  success: boolean;
  data: {
    user: any;
    modules: PermissionNode[];
  };
}

export interface UserSidebarVisibilityResponse {
  success: boolean;
  data: {
    userId: string;
    sidebarItemIds: string[];
  };
}

const permissionsService = {
  getMyPermissions: async () => {
    const response = await api.get<MyPermissionsResponse>('/permissions/me', { timeout: 60000 });
    return response.data;
  },

  getUserSidebarVisibility: async (userId: string) => {
    const response = await api.get<UserSidebarVisibilityResponse>(`/permissions/users/${userId}/sidebar-visibility`);
    return response.data;
  },

  setUserSidebarVisibility: async (userId: string, sidebarItemIds: string[]) => {
    const response = await api.put<UserSidebarVisibilityResponse>(`/permissions/users/${userId}/sidebar-visibility`, { sidebarItemIds });
    return response.data;
  },
};

export default permissionsService;

