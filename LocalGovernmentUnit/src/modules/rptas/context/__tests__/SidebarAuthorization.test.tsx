import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import Sidebar from '@/modules/rptas/shared/components/layout/Sidebar';
import { SidebarProvider } from '@/modules/rptas/context/SidebarContext';

const getSidebarItemsMock = vi.fn();

vi.mock('@/services/sidebarService', () => ({
  default: {
    getSidebarItems: (...args: any[]) => getSidebarItemsMock(...args),
  },
}));

vi.mock('@/modules/rptas/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'User', role: 'user' },
    logout: vi.fn(),
  }),
}));

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('Sidebar authorization (DB-driven)', () => {
  const storage = createLocalStorageMock();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    storage.clear();
    getSidebarItemsMock.mockReset();
  });

  const renderSidebar = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>
    );

  it('does not inject module navigation when DB does not return it', async () => {
    getSidebarItemsMock.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          path: '/dashboard',
          icon: null,
          parentId: null,
          order: 1,
          adminOnly: false,
          isActive: true,
          children: [],
        },
      ],
    });

    renderSidebar();

    await screen.findByLabelText('Navigate to Dashboard');
    expect(screen.queryByText('RPTAS')).not.toBeInTheDocument();
    expect(screen.queryByText('Treasury')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Entry')).not.toBeInTheDocument();
  });

  it('filters adminOnly items client-side for non-admin users', async () => {
    getSidebarItemsMock.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'admin-only',
          label: 'Admin Only Page',
          path: '/admin-only',
          icon: null,
          parentId: null,
          order: 1,
          adminOnly: true,
          isActive: true,
          children: [],
        },
      ],
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.queryByText('Admin Only Page')).not.toBeInTheDocument();
    });
  });

  it('filters user-specific items client-side for unauthorized users', async () => {
    getSidebarItemsMock.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'selected-user-page',
          label: 'Selected User Page',
          path: '/selected-user-page',
          icon: null,
          parentId: null,
          order: 1,
          adminOnly: false,
          isActive: true,
          visibleToUserIds: ['u2'], // u1 is not in the list
          children: [],
        },
      ],
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.queryByText('Selected User Page')).not.toBeInTheDocument();
    });
  });

  it('clears cached DB menu and menu state on logout event', async () => {
    storage.setItem(
      'sidebarDbItemsCache',
      JSON.stringify({
        ts: Date.now(),
        data: [
          {
            id: 'cached',
            label: 'Cached Page',
            path: '/cached',
            icon: null,
            parentId: null,
            order: 1,
            adminOnly: false,
            isActive: true,
            children: [],
          },
        ],
      })
    );
    getSidebarItemsMock.mockRejectedValueOnce(new Error('network down'));

    renderSidebar();

    await screen.findByLabelText('Navigate to Cached Page');

    window.dispatchEvent(new Event('auth:logout'));

    await waitFor(() => {
      expect(screen.queryByText('Cached Page')).not.toBeInTheDocument();
      expect(storage.getItem('sidebarDbItemsCache')).toBeNull();
    });
  });

  it('refreshes DB menu after role change event', async () => {
    getSidebarItemsMock
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'first',
            label: 'First Menu',
            path: '/first',
            icon: null,
            parentId: null,
            order: 1,
            adminOnly: false,
            isActive: true,
            children: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'second',
            label: 'Second Menu',
            path: '/second',
            icon: null,
            parentId: null,
            order: 1,
            adminOnly: false,
            isActive: true,
            children: [],
          },
        ],
      });

    renderSidebar();
    await screen.findByLabelText('Navigate to First Menu');

    window.dispatchEvent(new Event('auth:role_changed'));

    await screen.findByLabelText('Navigate to Second Menu');
    expect(getSidebarItemsMock).toHaveBeenCalledTimes(2);
  });
});

