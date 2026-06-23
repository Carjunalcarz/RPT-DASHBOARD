import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BuildingUnitCostSetupPage from './BuildingUnitCostSetupPage';

vi.mock('@/services/landTaxService', () => ({
  getMunicipalities: vi.fn().mockResolvedValue([
    { code: '04', name: 'BUENAVISTA' },
    { code: '05', name: 'CARMEN' },
  ]),
}));

vi.mock('@/modules/rptas/shared/services/bldgStrucTypeService', () => ({
  getBldgStrucTypes: vi.fn().mockResolvedValue({
    data: [
      { Code: 'A', Description: 'AGRICULTURAL' },
      { Code: 'R', Description: 'RESIDENTIAL' },
    ],
    pagination: { total: 2, page: 1, limit: 2000, totalPages: 1 },
  }),
}));

const getBldgUnitCostsMock = vi.fn();
const getDistinctEffDatesMock = vi.fn();
const createBldgUnitCostSetMock = vi.fn();
vi.mock('@/modules/rptas/shared/services/bldgUnitCostService', () => ({
  getBldgUnitCosts: (...args: any[]) => getBldgUnitCostsMock(...args),
  getDistinctBldgUnitCostEffDates: (...args: any[]) => getDistinctEffDatesMock(...args),
  createBldgUnitCostSet: (...args: any[]) => createBldgUnitCostSetMock(...args),
}));

describe('BuildingUnitCostSetupPage', () => {
  beforeEach(() => {
    getBldgUnitCostsMock.mockResolvedValue({
      data: [
        {
          StrucType: 'R',
          BldgCode: 'ASHED',
          BldgCodeDesc: 'LIGHT MATERIALS - 6th GR',
          UNIT_VALUE: 1290,
          Eff_Date: '2026-01-01T00:00:00.000Z',
          City: '04',
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    getDistinctEffDatesMock.mockResolvedValue({ success: true, data: ['2026-01-01', '2025-01-01'] });
    createBldgUnitCostSetMock.mockResolvedValue({ success: true, data: { set: { id: 'set-1' }, itemCount: 1 } });
  });

  it('renders records from API and shows formatted unit value', async () => {
    render(<BuildingUnitCostSetupPage />);

    await waitFor(() => expect(getBldgUnitCostsMock).toHaveBeenCalled());
    expect(await screen.findByText('ASHED')).toBeInTheDocument();
    expect(screen.getByText('LIGHT MATERIALS - 6th GR')).toBeInTheDocument();
    expect(screen.getByText('1,290.00')).toBeInTheDocument();
    expect(screen.getAllByText('2026-01-01').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by city and building code', async () => {
    render(<BuildingUnitCostSetupPage />);

    await waitFor(() => expect(getBldgUnitCostsMock).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId('filter-city'), { target: { value: '04' } });
    await waitFor(() =>
      expect(getBldgUnitCostsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ city: '04' })
      )
    );

    fireEvent.change(screen.getByTestId('filter-bldg-code'), { target: { value: 'ASHED' } });
    await waitFor(() =>
      expect(getBldgUnitCostsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ bldgCode: 'ASHED' })
      )
    );
  });

  it('filters by distinct eff date', async () => {
    render(<BuildingUnitCostSetupPage />);

    await waitFor(() => expect(getDistinctEffDatesMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('filter-eff-date')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('filter-eff-date'), { target: { value: '2026-01-01' } });
    await waitFor(() =>
      expect(getBldgUnitCostsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ effDate: '2026-01-01' })
      )
    );
  });

  it('creates a unit cost set from selected items with ordinance info', async () => {
    render(<BuildingUnitCostSetupPage />);

    await waitFor(() => expect(getBldgUnitCostsMock).toHaveBeenCalled());

    const rowCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(rowCheckboxes[1]);

    fireEvent.change(screen.getByTestId('input-ordinance-no'), { target: { value: '716-2024' } });
    fireEvent.change(screen.getByTestId('input-ordinance-date'), { target: { value: '2024-12-03' } });

    const createBtn = screen.getByTestId('btn-create-unit-cost-set');
    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);

    await waitFor(() => expect(screen.getByText('Create Building Unit Cost Set')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() =>
      expect(createBldgUnitCostSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ordinanceNo: '716-2024',
          ordinanceDate: '2024-12-03',
          items: [
            expect.objectContaining({
              city: '04',
              strucType: 'R',
              bldgCode: 'ASHED',
              unitValue: 1290,
              effDate: '2026-01-01',
            }),
          ],
        })
      )
    );
  });
});
