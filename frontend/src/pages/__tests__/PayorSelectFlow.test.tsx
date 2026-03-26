import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#0ea5e9' }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'user', email: 'user@example.com' } }),
}));

vi.mock('@/services/reportsService', () => ({
  getTaxBegYears: vi.fn().mockResolvedValue(['2026']),
  getPropertyReport: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
}));

vi.mock('@/services/oopService', () => ({
  default: {},
}));

vi.mock('@/services/payorService', () => ({
  default: {
    search: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'p1',
          firstName: 'Aljun',
          lastName: 'Cardona',
          address: 'Somewhere',
          idType: 'national_id',
          idNumber: '12345678',
          contact: { phone: '0901', email: 'a@b.com' },
        },
      ],
    }),
    create: vi.fn(),
    bulkCreate: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Payor selection → OOP', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const ls = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    } as any;
    (globalThis as any).localStorage = ls;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('stores selected payor and navigates to OOP', async () => {
    const PayorRegistry = (await import('@/pages/PayorRegistry')).default;
    render(
      <MemoryRouter>
        <PayorRegistry />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Payor search'), { target: { value: 'Aljun' } });
    await new Promise((r) => setTimeout(r, 350));
    const useBtn = await screen.findByRole('button', { name: /Use in OOP/i });
    fireEvent.click(useBtn);

    expect(localStorage.getItem('oop_selected_payor')).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith('/payments/order');
  });

  it('auto-fills payer name in Order of Payment from selection', async () => {
    localStorage.setItem(
      'oop_selected_payor',
      JSON.stringify({ id: 'p1', firstName: 'Aljun', lastName: 'Cardona' })
    );

    const OrderOfPayment = (await import('@/pages/OrderOfPayment')).default;
    render(
      <MemoryRouter>
        <OrderOfPayment />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter payer name')).toHaveValue('Aljun Cardona');
    });
  });
});
