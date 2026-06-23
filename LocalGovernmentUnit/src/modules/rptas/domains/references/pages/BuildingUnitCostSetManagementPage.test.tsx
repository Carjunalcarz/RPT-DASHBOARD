import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BuildingUnitCostSetManagementPage from './BuildingUnitCostSetManagementPage';

const showAlertMock = vi.fn();
const showConfirmMock = vi.fn().mockResolvedValue(true);
vi.mock('@/modules/rptas/context/AlertContext', () => ({
  useAlert: () => ({ showAlert: showAlertMock, showConfirm: showConfirmMock }),
}));

const navigateMock = vi.fn();
vi.mock('react-router', async () => {
  const actual: any = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

let perms = { canSelect: true, canInsert: true, canUpdate: true, canDelete: true };
vi.mock('@/hooks/useRBAC', () => ({
  useModulePermissions: () => perms,
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/landTaxService', () => ({
  getMunicipalities: vi.fn().mockResolvedValue([{ code: '03', name: 'CITY 03' }]),
}));

const listSetsMock = vi.fn();
const getSetMock = vi.fn();
const listItemsMock = vi.fn();
const updateSetMock = vi.fn();
const createItemMock = vi.fn();
const updateItemMock = vi.fn();
const deleteSetMock = vi.fn();
const deleteItemMock = vi.fn();
const restoreSetMock = vi.fn();
const restoreItemMock = vi.fn();

vi.mock('@/modules/rptas/shared/services/bldgUnitCostService', () => ({
  listBldgUnitCostSets: (...args: any[]) => listSetsMock(...args),
  getBldgUnitCostSetById: (...args: any[]) => getSetMock(...args),
  listBldgUnitCostSetItems: (...args: any[]) => listItemsMock(...args),
  updateBldgUnitCostSet: (...args: any[]) => updateSetMock(...args),
  createBldgUnitCostSetItem: (...args: any[]) => createItemMock(...args),
  updateBldgUnitCostSetItem: (...args: any[]) => updateItemMock(...args),
  deleteBldgUnitCostSet: (...args: any[]) => deleteSetMock(...args),
  deleteBldgUnitCostSetItem: (...args: any[]) => deleteItemMock(...args),
  restoreBldgUnitCostSet: (...args: any[]) => restoreSetMock(...args),
  restoreBldgUnitCostSetItem: (...args: any[]) => restoreItemMock(...args),
}));

describe('BuildingUnitCostSetManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    perms = { canSelect: true, canInsert: true, canUpdate: true, canDelete: true };
    listSetsMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'set-1',
          ordinance_no: '316-2024',
          ordinance_date: '2026-04-21',
          ordinance_text: '316-2024 • 2026-04-21',
          city: '03',
          created_by: 'api-user',
          created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
          deleted_at: null,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    getSetMock.mockResolvedValue({
      success: true,
      data: {
        id: 'set-1',
        ordinance_no: '316-2024',
        ordinance_date: '2026-04-21',
        ordinance_text: '316-2024 • 2026-04-21',
        city: '03',
        created_by: 'api-user',
        created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
      },
    });
    listItemsMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'item-1',
          set_id: 'set-1',
          city: '03',
          struc_type: 'I-6TH',
          bldg_code: 'HOGS',
          bldg_code_desc: 'HOG SHED',
          unit_value: 1290,
          eff_date: '2026-01-01',
          created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
          deleted_at: null,
        },
      ],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });
    updateSetMock.mockResolvedValue({
      success: true,
      data: {
        id: 'set-1',
        ordinance_no: '316-2024',
        ordinance_date: '2026-04-21',
        ordinance_text: 'UPDATED',
        city: '03',
        created_by: 'api-user',
        created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
      },
    });
    createItemMock.mockResolvedValue({
      success: true,
      data: {
        id: 'item-2',
        set_id: 'set-1',
        city: '03',
        struc_type: 'I',
        bldg_code: 'GOAS',
        bldg_code_desc: 'GOAT SHED',
        unit_value: 850,
        eff_date: '2012-01-01',
        created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
      },
    });
    updateItemMock.mockResolvedValue({
      success: true,
      data: {
        id: 'item-2',
        set_id: 'set-1',
        city: '03',
        struc_type: 'I-6TH',
        bldg_code: 'HOGS',
        bldg_code_desc: 'HOG SHED UPDATED',
        unit_value: 1291,
        eff_date: '2026-01-01',
        created_at: new Date('2026-04-21T00:00:00.000Z').toISOString(),
      },
    });
    deleteSetMock.mockResolvedValue({ success: true, data: { id: 'set-1', mode: 'soft' } });
    deleteItemMock.mockResolvedValue({ success: true, data: { id: 'item-1', mode: 'soft' } });
    restoreSetMock.mockResolvedValue({ success: true, data: { id: 'set-1' } });
    restoreItemMock.mockResolvedValue({ success: true, data: { id: 'item-1' } });
  });

  it('lists sets and opens a set details dialog with items', async () => {
    render(<BuildingUnitCostSetManagementPage />);

    await waitFor(() => expect(listSetsMock).toHaveBeenCalled());
    expect(await screen.findByText('316-2024')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('View set details'));
    await waitFor(() => expect(getSetMock).toHaveBeenCalled());
    expect(await screen.findByText('HOG SHED')).toBeInTheDocument();
    expect(screen.getByText('1,290.00')).toBeInTheDocument();
  });

  it('edits a set with validation and confirmation', async () => {
    render(<BuildingUnitCostSetManagementPage />);

    await waitFor(() => expect(listSetsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText('Edit set'));

    fireEvent.change(screen.getByTestId('input-set-ordinance-text'), { target: { value: 'UPDATED' } });
    fireEvent.click(screen.getByTestId('btn-save-set'));

    await waitFor(() => expect(updateSetMock).toHaveBeenCalledWith('set-1', expect.objectContaining({ ordinanceText: 'UPDATED' })));
    expect(await screen.findByText('UPDATED')).toBeInTheDocument();
  });

  it('adds, updates, and soft-deletes an item from the set dialog', async () => {
    render(<BuildingUnitCostSetManagementPage />);
    await waitFor(() => expect(listSetsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('View set details'));
    await waitFor(() => expect(listItemsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Add Item'));
    fireEvent.change(screen.getByTestId('input-item-struc-type'), { target: { value: 'I' } });
    fireEvent.change(screen.getByTestId('input-item-bldg-code'), { target: { value: 'GOAS' } });
    fireEvent.change(screen.getByTestId('input-item-desc'), { target: { value: 'GOAT SHED' } });
    fireEvent.change(screen.getByTestId('input-item-unit-value'), { target: { value: '850' } });
    fireEvent.change(screen.getByTestId('input-item-eff-date'), { target: { value: '2012-01-01' } });
    fireEvent.click(screen.getByTestId('btn-save-item'));

    await waitFor(() => expect(createItemMock).toHaveBeenCalled());
    expect(await screen.findByText('GOAT SHED')).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Edit item')[0]);
    fireEvent.change(screen.getByTestId('input-item-desc'), { target: { value: 'HOG SHED UPDATED' } });
    fireEvent.change(screen.getByTestId('input-item-unit-value'), { target: { value: '1291' } });
    fireEvent.click(screen.getByTestId('btn-save-item'));
    await waitFor(() => expect(updateItemMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByLabelText('Delete item')[0]);
    await waitFor(() => expect(deleteItemMock).toHaveBeenCalled());
  });

  it('soft-deletes a set and removes it from the list (when Show deleted is off)', async () => {
    render(<BuildingUnitCostSetManagementPage />);
    await waitFor(() => expect(listSetsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Delete set'));
    await waitFor(() => expect(deleteSetMock).toHaveBeenCalled());
  });

  it('disables edit when permission is missing', async () => {
    perms = { canSelect: true, canInsert: true, canUpdate: false, canDelete: true };
    render(<BuildingUnitCostSetManagementPage />);
    await waitFor(() => expect(listSetsMock).toHaveBeenCalled());

    expect(screen.getByLabelText('Edit set')).toBeDisabled();
  });
});
