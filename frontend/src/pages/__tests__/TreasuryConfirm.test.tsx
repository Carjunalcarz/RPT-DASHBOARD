import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import TreasuryConfirm from '@/pages/TreasuryConfirm';
import { useAuth } from '@/context/AuthContext';
import oopService from '@/services/oopService';

vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#0ea5e9' }),
}));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/context/AuthContext');

vi.mock('@/services/oopService', () => ({
  default: {
    listPending: vi.fn(),
    markPaid: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TreasuryConfirm', () => {
  it('shows assignment error when backend returns 403', async () => {
    (oopService.listPending as any).mockRejectedValue({ response: { status: 403, data: { message: 'Not assigned' } } });
    (useAuth as Mock).mockReturnValue({ user: { id: 'u1', role: 'admin' } });

    render(<TreasuryConfirm />);
    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();
    expect(await screen.findByText('Not assigned')).toBeInTheDocument();
  });

  it('does not show assignment error when backend allows', async () => {
    (oopService.listPending as any).mockResolvedValue({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    (useAuth as Mock).mockReturnValue({ user: { id: 'u2', role: 'user' } });

    render(<TreasuryConfirm />);
    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();
    expect(screen.queryByText('Not assigned')).not.toBeInTheDocument();
  });
});
