import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TreesModal from './rpt_m_TreesModal';

const getTreeLibraryMock = vi.fn();
const getTreesByTdnMock = vi.fn();

vi.mock('@/modules/rptas/shared/services/rptTreeService', () => ({
  getTreeLibrary: (...args: any[]) => getTreeLibraryMock(...args),
  getTreesByTdn: (...args: any[]) => getTreesByTdnMock(...args),
}));

describe('TreesModal', () => {
  it('keeps user-added trees even if initial fetch resolves after adding', async () => {
    let resolveTreesByTdn: ((value: any) => void) | null = null;
    getTreesByTdnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTreesByTdn = resolve;
        })
    );
    getTreeLibraryMock.mockResolvedValue([
      {
        Region: 'R',
        Prov: 'P',
        City: 'C',
        Code: 'T01',
        Description: 'Fruit Beari',
        Eff_Date: '2024-01-01',
        Rate: 10,
        NFB_Rate: 5,
      },
    ]);

    render(
      <TreesModal
        open={true}
        onOpenChange={() => {}}
        tdn="TDN123"
        readOnly={false}
      />
    );

    await screen.findByText('Trees & Plants Assessment');
    await screen.findByText(/Fruit Beari\s*\(\s*2024\s*\)/i);

    const comboboxes = await screen.findAllByRole('combobox');
    const plantSelect = comboboxes[0];

    fireEvent.change(plantSelect, { target: { value: 'T01|2024-01-01' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await screen.findAllByRole('cell', { name: /Fruit Beari/i });

    resolveTreesByTdn?.([]);

    await waitFor(() => {
      expect(screen.getAllByRole('cell', { name: /Fruit Beari/i }).length).toBeGreaterThan(0);
    });
  });
});
