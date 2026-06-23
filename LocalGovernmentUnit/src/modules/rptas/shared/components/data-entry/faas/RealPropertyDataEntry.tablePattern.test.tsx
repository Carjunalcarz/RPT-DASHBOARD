import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationCartProvider } from '@/modules/rptas/context/MigrationCartContext';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RealPropertyDataEntry from './RealPropertyDataEntry';
import useSWR from 'swr';

const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('swr', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('@/modules/rptas/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#ffffff', headerColorDark: '#000000' }),
}));

vi.mock('@/modules/rptas/context/AlertContext', () => ({
  useAlert: () => ({ showConfirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock('@/modules/rptas/hooks/useIdempotency', () => ({
  useIdempotency: () => ({
    idempotencyKey: 'mock-key',
    refreshKey: vi.fn(),
  }),
}));

vi.mock('@/modules/rptas/shared/services/faasService', () => ({
  listFaasRecords: vi.fn(),
  saveDraft: vi.fn(),
  submitForReview: vi.fn(),
  getFaasRecord: vi.fn(),
  deleteFaasRecord: vi.fn(),
  cancelFaasTransaction: vi.fn(),
  getDistinctTaxBegYears: vi.fn().mockResolvedValue([]),
}));

vi.mock('./PropertyInformationSection', () => ({ default: () => <div data-testid="property-info" /> }));
vi.mock('./PropertyOwnerSection', () => ({ default: () => <div /> }));
vi.mock('./PropertyBoundariesSection', () => ({ default: () => <div /> }));
vi.mock('./AssessmentSection', () => ({ default: () => <div /> }));
vi.mock('./ReferenceSection', () => ({ default: () => <div /> }));
vi.mock('./SignatoriesSection', () => ({ default: () => <div /> }));
vi.mock('./PreviousTDNsSection', () => ({ default: () => <div /> }));
vi.mock('./TaxDecSheetSection', () => ({ default: () => <div /> }));
vi.mock('../OtherPropertyTab', () => ({ default: () => <div /> }));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MigrationCartProvider>{ui}</MigrationCartProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('RealPropertyDataEntry table pattern parity', () => {
  beforeEach(() => {
    localStorageMock.clear();
    (useSWR as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            TDN: '009-00143-GR',
            P_OLD_TDN: '009-00001-GR',
            PIN: '053-07-0002-003-32',
            Owner_Name: 'Juan Dela Cruz',
            BARANGAY: 'POBLACION',
            CITY: '04',
            'BRGY.CODE': '009',
            TAX_BEG_YR: '2024',
            status: 'approved',
            ApprovedDate: '2024-01-02T00:00:00.000Z',
          },
        ],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 100 },
      },
      error: null,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });
  });

  it('uses the RPT-management style SWR key prefix', async () => {
    renderWithProviders(<RealPropertyDataEntry />);

    await waitFor(() => expect(screen.getByTestId('records-table')).toBeInTheDocument());
    expect(useSWR).toHaveBeenCalledWith(
      expect.arrayContaining(['faas-records']),
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('renders ARP as current TDN and includes a status date suffix when available', async () => {
    renderWithProviders(<RealPropertyDataEntry />);

    const row = await screen.findByTestId(/record-row-/);
    const cells = within(row).getAllByRole('cell');

    expect(cells[1].textContent).toContain('009-00143-GR');
    expect(cells[3].textContent).toContain('009-00143-GR');
    expect(within(cells[5]).getByText(/approved/i)).toBeInTheDocument();
    expect(within(cells[5]).getByText(/•/)).toBeInTheDocument();
  });

  it('derives TAX BEG YR from TDN prefix when TAX_BEG_YR is stale', async () => {
    (useSWR as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            TDN: '49-04-0001-00019',
            PIN: '053-04-0001-001-07',
            Owner_Name: 'Test Owner',
            BARANGAY: 'POBLACION',
            CITY: '04',
            'BRGY.CODE': '0001',
            TAX_BEG_YR: '2023',
            status: 'draft',
          },
        ],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 100 },
      },
      error: null,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    renderWithProviders(<RealPropertyDataEntry />);

    const row = await screen.findByTestId(/record-row-/);
    const cells = within(row).getAllByRole('cell');
    expect(cells[7].textContent).toContain('2050');
  });
});
