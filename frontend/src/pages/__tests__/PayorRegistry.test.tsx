import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PayorRegistry from '@/pages/PayorRegistry';
import payorService from '@/services/payorService';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#0ea5e9' }),
}));

vi.mock('@/services/payorService', () => ({
  default: {
    search: vi.fn(),
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

describe('PayorRegistry', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debounces search and calls API', async () => {
    (payorService.search as any).mockResolvedValue({ success: true, data: [] });
    render(
      <MemoryRouter>
        <PayorRegistry />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Payor search'), { target: { value: 'juan' } });
    await new Promise((r) => setTimeout(r, 350));

    await waitFor(() => {
      expect(payorService.search).toHaveBeenCalledWith('juan', 10);
    }, { timeout: 1000 });
  });

  it('validates required fields on single register', async () => {
    render(
      <MemoryRouter>
        <PayorRegistry />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    expect(screen.getAllByText('Required')).toHaveLength(4);
  });

  it('submits bulk import', async () => {
    (payorService.bulkCreate as any).mockResolvedValue({ success: true, created: [], duplicates: [], failed: [] });
    render(
      <MemoryRouter>
        <PayorRegistry />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Bulk Import/i }));
    await screen.findByText(/Bulk Register \(CSV\)/i);
    fireEvent.change(screen.getByLabelText('Bulk CSV'), {
      target: {
        value:
          'first_name,last_name,address,id_type,id_number,phone,email\nJuan,Dela Cruz,Somewhere,national_id,12345678,+639171234567,juan@example.com',
      },
    });
    const importBtn = screen.getAllByRole('button').find((b) => (b.textContent || '').trim() === 'Import');
    expect(importBtn).toBeTruthy();
    fireEvent.click(importBtn as HTMLButtonElement);

    await waitFor(() => {
      expect(payorService.bulkCreate).toHaveBeenCalled();
    });
  });
});
