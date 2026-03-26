import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import OrderOfPayment from '@/pages/OrderOfPayment';
import { useAuth } from '@/context/AuthContext';
import { getPropertyReport, getTaxBegYears } from '@/services/reportsService';
import oopService from '@/services/oopService';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#0ea5e9' }),
}));

vi.mock('@/services/reportsService');
vi.mock('@/context/AuthContext');
vi.mock('@/services/oopService', () => ({
  default: {
    create: vi.fn(),
    get: vi.fn(),
    listPending: vi.fn(),
    markPaid: vi.fn(),
  },
}));

vi.mock('react-to-print', () => ({
  useReactToPrint: () => () => undefined,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Order of Payment module', () => {
  const record = {
    assessmentId: 'A-1',
    ownerName: 'JUAN A. DELA CRUZ',
    tdn: '25-01-0001-00001',
    pin: '053-01-0001-002-14-1006',
    kind: 'Building',
    municipality: '01',
    barangay: 'N/A',
    marketValue: 125120,
    assValue: 10000,
    taxBegYr: '2026',
    paymentStatus: 'unpaid',
  };

  let intervalSpy: ReturnType<typeof vi.spyOn> | null = null;
  let clearIntervalSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(() => 0 as unknown as number);
    clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
    (useAuth as Mock).mockReturnValue({ user: { id: 'user-1', role: 'user' } });
    (getTaxBegYears as Mock).mockResolvedValue(['2026']);
    (getPropertyReport as Mock).mockResolvedValue({
      data: [record],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  afterEach(() => {
    intervalSpy?.mockRestore();
    clearIntervalSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('removes legacy/alternate OOP implementations', () => {
    const appRouterPath = path.resolve(__dirname, '../../router/AppRouter.tsx');
    const appRouter = fs.readFileSync(appRouterPath, 'utf8');

    expect(appRouter).not.toMatch(/\/payments\/oop\//);
    expect(appRouter).not.toMatch(/OOPCreatePage/);
    expect(appRouter).not.toMatch(/OOPTreasurerPage/);

    expect(fs.existsSync(path.resolve(__dirname, '../oop/OOPCreatePage.tsx'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../oop/OOPTreasurerPage.tsx'))).toBe(false);
  });

  it('replaces Validate with Create Payment and handles success + paid transition', async () => {
    (oopService.create as Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'order-1',
        orderNumber: 'OOP-20260323-AAAAAA',
        createdBy: 'user-1',
        amount: '100.00',
        description: null,
        status: 'pending',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      },
    });

    (oopService.get as Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'order-1',
        orderNumber: 'OOP-20260323-AAAAAA',
        createdBy: 'user-1',
        amount: '100.00',
        description: null,
        status: 'paid',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      },
    });

    render(
      <MemoryRouter>
        <OrderOfPayment />
      </MemoryRouter>
    );

    await screen.findByText('JUAN A. DELA CRUZ');
    expect(screen.queryByText('Validate')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Payment/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(`Select ${record.tdn}`));
    fireEvent.change(screen.getByPlaceholderText('Enter payer name'), { target: { value: 'Juan' } });

    const assessmentTable = screen.getAllByRole('table')[0];
    const row = within(assessmentTable).getByText(record.tdn).closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Unpaid')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Create Payment/i }));

    await waitFor(() => {
      expect(oopService.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, payerName: 'Juan' }));
    });

    expect(within(row as HTMLElement).getByText('Pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh Status/i }));

    await waitFor(() => {
      expect(oopService.get).toHaveBeenCalledWith('order-1');
    });

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('Paid')).toBeInTheDocument();
    });
  });

  it('marks status as Failed when Create Payment fails', async () => {
    (oopService.create as Mock).mockResolvedValue({ success: false, message: 'Bad request' });

    render(
      <MemoryRouter>
        <OrderOfPayment />
      </MemoryRouter>
    );

    await screen.findByText('JUAN A. DELA CRUZ');
    fireEvent.click(screen.getByLabelText(`Select ${record.tdn}`));
    fireEvent.change(screen.getByPlaceholderText('Enter payer name'), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Payment/i }));

    const assessmentTable = screen.getAllByRole('table')[0];
    const row = within(assessmentTable).getByText(record.tdn).closest('tr');
    expect(row).toBeTruthy();

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('Failed')).toBeInTheDocument();
    });
  });

  it('allows Treasurer to confirm payment and updates status to Paid', async () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'treasurer-1', role: 'treasurer' } });

    (getPropertyReport as Mock)
      .mockResolvedValueOnce({
        data: [{ ...record, paymentStatus: 'pending' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ ...record, paymentStatus: 'paid' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

    (oopService.listPending as Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'order-1',
          orderNumber: 'OOP-20260323-AAAAAA',
          createdBy: 'user-1',
          amount: '100.00',
          description: 'desc',
          status: 'pending',
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    (oopService.markPaid as Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'order-1',
        orderNumber: 'OOP-20260323-AAAAAA',
        createdBy: 'user-1',
        amount: '100.00',
        description: 'desc',
        status: 'paid',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      },
    });

    render(
      <MemoryRouter>
        <OrderOfPayment />
      </MemoryRouter>
    );

    await screen.findByText('Treasury Confirmation');
    await screen.findByText('OOP-20260323-AAAAAA');

    const assessmentTable = screen.getAllByRole('table')[0];
    const row = within(assessmentTable).getByText(record.tdn).closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Pending')).toBeInTheDocument();

    (globalThis as any).confirm = vi.fn(() => true);
    fireEvent.click(screen.getByRole('button', { name: /Confirm Paid/i }));

    await waitFor(() => {
      expect(oopService.markPaid).toHaveBeenCalledWith('order-1');
    });

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('Paid')).toBeInTheDocument();
    });
  });
});
