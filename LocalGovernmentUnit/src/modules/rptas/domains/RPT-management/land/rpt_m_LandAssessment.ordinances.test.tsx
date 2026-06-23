import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from '@/modules/rptas/context/AlertContext';
import LandAssessment from './rpt_m_LandAssessment';
import { actualUseOrdinancesQueryKey } from '../queries/actualUseOrdinancesQuery';

vi.mock('@/modules/rptas/shared/services/cityService', () => ({
  getCities: vi.fn().mockResolvedValue({ data: [], meta: { totalPages: 1 } }),
}));

vi.mock('@/modules/rptas/shared/services/actualUseRateService', () => ({
  getActualUseRates: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/modules/rptas/shared/components/data-entry/useMainClassOptions', () => ({
  useMainClassOptions: () => ({ options: [], isLoading: false }),
}));

vi.mock('@/modules/rptas/shared/components/data-entry/useConfiguredMainClassOptions', () => ({
  useConfiguredMainClassOptions: () => ({
    options: [
      { code: 'R', name: 'Residential' },
      { code: 'C', name: 'Commercial' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/modules/rptas/shared/components/data-entry/useActualUseOptions', () => ({
  useActualUseOptions: () => ({ options: [], isLoading: false }),
}));

vi.mock('@/modules/rptas/shared/components/data-entry/useAssignedActualUseOptions', () => ({
  useAssignedActualUseOptions: () => ({
    options: [{ code: 'AR', name: 'Agricultural' }],
    isLoading: false,
  }),
}));

vi.mock('@/modules/rptas/shared/components/data-entry/MainClassSelect', () => ({
  default: (props: any) => <div data-testid="mock-main-class-select">{String(props?.value || '')}</div>,
}));

vi.mock('@/modules/rptas/shared/components/data-entry/ActualUseSelect', () => ({
  default: (props: any) => <div data-testid="mock-actual-use-select">{String(props?.value || '')}</div>,
}));

vi.mock('@/modules/rptas/shared/components/data-entry/MunicipalityDropdown', () => ({
  default: () => <div data-testid="mock-municipality-dropdown" />,
}));

vi.mock('./rpt_m_LandAdjustmentModal', () => ({
  default: () => null,
}));

vi.mock('./rpt_m_TreesModal', () => ({
  default: () => null,
}));

describe('LandAssessment ordinance prefetch', () => {
  it('shows ordinance options on initial render and does not show a loading indicator', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    queryClient.setQueryData(actualUseOrdinancesQueryKey, [
      {
        id: '1',
        municipality_code: 'ALL',
        class_level: 'ALL',
        ordinance_no: 'ORD-2024',
        date_approved: '2024-01-01',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: '2',
        municipality_code: 'CARMEN',
        class_level: '3',
        ordinance_no: 'ORD-CARMEN-3',
        date_approved: '2025-01-01',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <LandAssessment
            records={[
              {
                TDN: 'TDN123',
                KIND: 'Land',
                CLASSIFICATION: 'A',
                SUB_CLASS: 'A-1',
                CLASS_LEVEL: '1',
                MUNICIPALITY: 'Buenavista',
                ORDINANCE_NO: 'ORD-2024',
                ORDINANCE_DATE_APPROVED: '2024-01-01',
                ACTUAL_USE: 'AA',
                AREA: 1,
                IF_DEFAULT: true,
                UNIT_VALUE: 100,
                MARKET_VAL: 100,
                ASS_LEVEL: 50,
                ASS_VALUE: 50,
                TAXABILITY: 'TAXABLE',
                TAXABLE_RATE: 100,
                BU: '0',
                IdleLand: false,
              } as any,
            ]}
            isEnabled={true}
          />
        </AlertProvider>
      </QueryClientProvider>
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-2024 • 2024-01-01')).toBeInTheDocument();
    expect(screen.queryByText('ORD-CARMEN-3 • 2025-01-01')).not.toBeInTheDocument();

    const row = await screen.findByTestId('land-row-TDN123-0');
    fireEvent.click(row);

    const ordinanceSelect = await screen.findByTestId('input-ordinance');
    expect(ordinanceSelect).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('does not clear main class and actual use when ordinance changes the configured option lists', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    queryClient.setQueryData(actualUseOrdinancesQueryKey, [
      {
        id: '1',
        municipality_code: 'ALL',
        class_level: 'ALL',
        ordinance_no: 'ORD-2024',
        date_approved: '2024-01-01',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <LandAssessment
            records={[
              {
                TDN: 'TDN123',
                KIND: 'Land',
                CLASSIFICATION: 'A',
                SUB_CLASS: 'A-1',
                CLASS_LEVEL: '1',
                MUNICIPALITY: 'Buenavista',
                ORDINANCE_NO: 'ORD-2024',
                ORDINANCE_DATE_APPROVED: '2024-01-01',
                ACTUAL_USE: 'AA',
                AREA: 1,
                IF_DEFAULT: true,
                UNIT_VALUE: 100,
                MARKET_VAL: 100,
                ASS_LEVEL: 50,
                ASS_VALUE: 50,
                TAXABILITY: 'TAXABLE',
                TAXABLE_RATE: 100,
                BU: '0',
                IdleLand: false,
              } as any,
            ]}
            isEnabled={true}
          />
        </AlertProvider>
      </QueryClientProvider>
    );

    const row = await screen.findByTestId('land-row-TDN123-0');
    await act(async () => {
      fireEvent.click(row);
    });

    await waitFor(() => expect(screen.getByTestId('mock-main-class-select')).toHaveTextContent('A'));
    await waitFor(() => expect(screen.getByTestId('mock-actual-use-select')).toHaveTextContent('AA'));
  });
});
