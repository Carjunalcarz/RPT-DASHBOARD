import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PropertyInformationSection from './PropertyInformationSection';

vi.mock('@/services/landTaxService', () => ({
  getMunicipalities: vi.fn().mockResolvedValue([
    { code: '04', name: 'BUENAVISTA' },
    { code: '05', name: 'CARMEN' },
  ]),
}));

vi.mock('@/modules/rptas/shared/services/barangayService', () => ({
  getBarangays: vi.fn().mockImplementation((_page: number, _pageSize: number, _search?: string, cityCode?: string) => {
    if (cityCode === '04') {
      return Promise.resolve({
        data: [
          { CODE: '0001', DESCRIPTION: 'POBLACION', CITY: '04' },
          { CODE: '0002', DESCRIPTION: 'SAN ISIDRO', CITY: '04' },
        ],
        meta: { total: 2, page: 1, pageSize: 1000, totalPages: 1 },
      });
    }
    if (cityCode === '05') {
      return Promise.resolve({
        data: [{ CODE: '0003', DESCRIPTION: 'STO. ROSARIO', CITY: '05' }],
        meta: { total: 1, page: 1, pageSize: 1000, totalPages: 1 },
      });
    }
    return Promise.resolve({ data: [], meta: { total: 0, page: 1, pageSize: 1000, totalPages: 1 } });
  }),
}));

describe('PropertyInformationSection location fields', () => {
  it('uses CITY for municipality selection and BCODE for barangay selection', async () => {
    render(
      <PropertyInformationSection
        isEnabled={true}
        selectedRecord={
          {
            id: '1',
            tdn: '22-04-0001-00019',
            arp: '22-04-0001-00019',
            pin: '053-04-0001-001-07',
            ownerNo: '',
            owner: '',
            CITY: '04',
            BCODE: '0001',
            BARANGAY: 'POBLACION',
          } as any
        }
      />
    );

    await waitFor(() => expect(screen.getByTestId('select-municipality')).toBeInTheDocument());

    const muniSelect = screen.getByTestId('select-municipality') as HTMLSelectElement;
    expect(muniSelect.value).toBe('04');
    await waitFor(() => expect(screen.getByTestId('display-municipality-name')).toHaveValue('BUENAVISTA'));

    await waitFor(() => expect(screen.getByTestId('select-barangay')).not.toBeDisabled());
    const barangaySelect = screen.getByTestId('select-barangay') as HTMLSelectElement;
    expect(barangaySelect.value).toBe('0001');
    await waitFor(() => expect(screen.getByTestId('display-barangay-name')).toHaveValue('POBLACION'));
  });

  it('replaces N/A barangay name with lookup name based on BCODE', async () => {
    render(
      <PropertyInformationSection
        isEnabled={true}
        selectedRecord={
          {
            id: '1',
            tdn: '22-04-0001-00019',
            arp: '22-04-0001-00019',
            pin: '053-04-0001-001-07',
            ownerNo: '',
            owner: '',
            CITY: '04',
            BCODE: '0002',
            BARANGAY: 'N/A',
          } as any
        }
      />
    );

    await waitFor(() => expect(screen.getByTestId('select-barangay')).not.toBeDisabled());
    await waitFor(() => expect(screen.getByTestId('display-barangay-name')).toHaveValue('SAN ISIDRO'));
  });

  it('clears barangay when municipality changes', async () => {
    render(
      <PropertyInformationSection
        isEnabled={true}
        selectedRecord={
          {
            id: '1',
            tdn: '22-04-0001-00019',
            arp: '22-04-0001-00019',
            pin: '053-04-0001-001-07',
            ownerNo: '',
            owner: '',
            CITY: '04',
            BCODE: '0001',
            BARANGAY: 'POBLACION',
          } as any
        }
      />
    );

    await waitFor(() => expect(screen.getByTestId('select-municipality')).toBeInTheDocument());
    const muniSelect = screen.getByTestId('select-municipality') as HTMLSelectElement;

    await waitFor(() => expect(screen.getByRole('option', { name: '05' })).toBeInTheDocument());
    fireEvent.change(muniSelect, { target: { value: '05' } });

    await waitFor(() => expect(screen.getByTestId('display-municipality-name')).toHaveValue('CARMEN'));
    await waitFor(() => expect(screen.getByTestId('select-barangay')).toHaveValue(''));
    await waitFor(() => expect(screen.getByTestId('display-barangay-name')).toHaveValue(''));
  });
});
