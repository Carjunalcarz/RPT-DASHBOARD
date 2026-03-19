import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignatoriesSection from './rpt_m_SignatoriesSection';

// Mock the context hooks
vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({
    headerColor: '#000000',
    headerColorDark: '#000000',
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User', role: 'Administrator' },
  }),
}));

// Mock the services
vi.mock('@/services/setupSignatoryTemplatesService', () => ({
  listTemplates: vi.fn().mockResolvedValue({
    data: [
      {
        id: '1',
        year: 2024,
        isActive: true,
        description: 'Test Template 2024',
        appraisedBy: { name: 'Appraiser Name', title: 'Appraiser Title' },
      },
    ],
  }),
}));

vi.mock('@/services/setupSignatoriesService', () => ({
  listSetupSignatories: vi.fn().mockResolvedValue({
    data: [],
    meta: { totalPages: 1 },
  }),
}));

describe('SignatoriesSection Auto-Prefill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the Auto-Prefill button when not in edit mode and no transaction is active', () => {
    render(<SignatoriesSection isEnabled={true} />);
    
    const prefillBtn = screen.queryByTestId('btn-auto-prefill');
    expect(prefillBtn).not.toBeInTheDocument();
  });

  it('shows the Auto-Prefill button when in edit mode', async () => {
    render(<SignatoriesSection isEnabled={true} />);
    
    const editBtn = screen.getByText(/Edit/i);
    fireEvent.click(editBtn);
    
    const prefillBtn = screen.getByTestId('btn-auto-prefill');
    expect(prefillBtn).toBeInTheDocument();
    expect(prefillBtn).not.toBeDisabled();
  });

  it('shows and enables the Auto-Prefill button when a transaction is active', () => {
    const transactionRecord = { id: 'TRANS-GR-123', tdn: 'TDN-123' };
    render(<SignatoriesSection selectedRecord={transactionRecord} isEnabled={true} />);
    
    const prefillBtn = screen.getByTestId('btn-auto-prefill');
    expect(prefillBtn).toBeInTheDocument();
    expect(prefillBtn).not.toBeDisabled();
  });

  it('prefills the form fields when Auto-Prefill is clicked', async () => {
    render(<SignatoriesSection isEnabled={true} />);
    
    // Enter edit mode
    const editBtn = screen.getByText(/Edit/i);
    fireEvent.click(editBtn);
    
    const prefillBtn = screen.getByTestId('btn-auto-prefill');
    fireEvent.click(prefillBtn);
    
    // Wait for the template to be applied
    await waitFor(() => {
      const appraisedBySelect = screen.getByDisplayValue('Appraiser Name');
      expect(appraisedBySelect).toBeInTheDocument();
    });
  });
});
