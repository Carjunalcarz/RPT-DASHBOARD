import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarProvider } from '@/context/SidebarContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test Admin', role: 'admin' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/services/sidebarService', () => ({
  default: {
    getSidebarItems: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'approvals',
          label: 'Approvals',
          path: '#',
          icon: null,
          parentId: null,
          order: 1,
          adminOnly: false,
          isActive: true,
          children: [
            {
              id: 'municipality',
              label: 'Municipality',
              path: '/approvals/municipal',
              icon: null,
              parentId: 'approvals',
              order: 1,
              adminOnly: false,
              isActive: true,
              children: [],
            },
            {
              id: 'province',
              label: 'Province',
              path: '/approvals/provincial',
              icon: null,
              parentId: 'approvals',
              order: 2,
              adminOnly: false,
              isActive: true,
              children: [],
            },
          ],
        },
      ],
    }),
  },
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

describe('Sidebar approval expansion', () => {
  const storage = createLocalStorageMock();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    storage.clear();
  });

  const renderSidebar = () => {
    return render(
      <MemoryRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>
    );
  };

  it('expands sidebar and shows approval children when clicked while collapsed', async () => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(true));
    renderSidebar();

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('w-16');

    const approvingParent = await screen.findByRole('button', { name: 'Expand Approvals' });
    fireEvent.click(approvingParent);

    expect(screen.getByTestId('sidebar').className).toContain('w-64');

    const municipality = await screen.findByLabelText('Navigate to Municipality');
    const province = await screen.findByLabelText('Navigate to Province');
    expect(municipality).toBeInTheDocument();
    expect(province).toBeInTheDocument();

    await screen.findByRole('button', { name: 'Collapse Approvals' });
  });
});

