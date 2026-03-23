import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'administrator' } }),
}));

vi.mock('@/context/SidebarContext', () => ({
  useSidebar: () => ({ refreshMenu: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#0ea5e9' }),
}));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/services/sidebarService', () => ({
  default: {
    getManagementSidebarItems: vi.fn(),
    updateSidebarItem: vi.fn(),
    createSidebarItem: vi.fn(),
    deleteSidebarItem: vi.fn(),
    seedSidebarItems: vi.fn(),
  },
}));

vi.mock('@/services/userService', () => ({
  getUsers: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SidebarManagement user picker modal', () => {
  it('selects users via modal and submits visibleToUserIds', async () => {
    const sidebarService = (await import('@/services/sidebarService')).default as any;
    const { getUsers } = (await import('@/services/userService')) as any;

    (getUsers as Mock).mockResolvedValue([
      { id: 'u1', email: 'user1@example.com', role: 'user', createdAt: new Date().toISOString() },
      { id: 'u2', email: 'user2@example.com', role: 'user', createdAt: new Date().toISOString() },
    ]);

    (sidebarService.getManagementSidebarItems as Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 's1',
          label: 'Payments',
          path: '/payments',
          icon: 'CreditCard',
          parentId: null,
          order: 1,
          adminOnly: false,
          isActive: true,
          visibleToUserIds: [],
        },
      ],
    });

    (sidebarService.updateSidebarItem as Mock).mockResolvedValue({ success: true });

    const SidebarManagement = (await import('@/pages/admin/SidebarManagement')).default;
    render(<SidebarManagement />);

    await screen.findByText('Payments');
    fireEvent.click(screen.getByTitle('Edit'));

    fireEvent.change(screen.getByDisplayValue('Everyone'), { target: { value: 'users' } });
    await screen.findByText('Select Users');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user1@example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    fireEvent.click(screen.getByLabelText('Save item'));

    await waitFor(() => {
      expect(sidebarService.updateSidebarItem).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ adminOnly: false, visibleToUserIds: ['u1'] })
      );
    });
  });
});
