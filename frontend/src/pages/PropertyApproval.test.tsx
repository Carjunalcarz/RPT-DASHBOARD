import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import PropertyApproval from './PropertyApproval';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { getRptMastDataDirect, updateSignatory } from '@/services/rptMastService';
import { getRptAssByTdn } from '@/services/rptAssService';
import { getFaasRecord, updateFaasStatus } from '@/services/faasService';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock hooks
vi.mock('@/context/AuthContext');
vi.mock('@/context/AlertContext');
vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#ffffff' }),
}));

// Mock services
vi.mock('@/services/rptMastService');
vi.mock('@/services/rptAssService');
vi.mock('@/services/faasService');

// Mock child components to avoid deep rendering issues
vi.mock('@/components/RPT-management/faas/rpt_m_PropertyDetailsView', () => {
  return {
    default: function DummyPropertyDetailsView() {
      return <div data-testid="property-details-view">Property Details</div>;
    },
  };
});

describe('PropertyApproval Page', () => {
  const mockUser = { name: 'Test Admin', role: 'admin', position: 'Administrator' };
  const showConfirmMock = vi.fn().mockResolvedValue(true);
  const mockRecord = {
    id: '1',
    TDN: '123-456',
    status: 'for-review',
    data: {
      TDN: '123-456',
      owner_name: 'John Doe',
      Rec_Approval: 'Recommended By Someone',
    }
  };

  beforeEach(() => {
    (useAuth as Mock).mockReturnValue({ user: mockUser });
    (useAlert as Mock).mockReturnValue({ showConfirm: showConfirmMock });
    (getFaasRecord as Mock).mockRejectedValue(new Error('Not a FAAS record ID'));
    (updateFaasStatus as Mock).mockResolvedValue({ success: true });
    (getRptMastDataDirect as Mock).mockResolvedValue({
      data: [{ id: '1', tdn: '123-456', status: 'for-review', data: mockRecord.data }]
    });
    (getRptAssByTdn as Mock).mockResolvedValue([]);
    (updateSignatory as Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/property-approval/123-456']}>
        <Routes>
          <Route path="/property-approval/:id" element={<PropertyApproval />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders property details and approval actions', async () => {
    renderComponent();

    // Check loading state first
    expect(screen.getByText(/Loading property details/i)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Property Approval')).toBeInTheDocument();
      expect(screen.getByText('TDN: 123-456')).toBeInTheDocument();
      expect(screen.getByTestId('property-details-view')).toBeInTheDocument();
    });

    // Check Action Buttons
    expect(screen.getByText(/Approve \(/)).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Request Changes')).toBeInTheDocument();
  });

  it('handles Approve action', async () => {
    renderComponent();
    await waitFor(() => screen.getByText(/Approve \(/));

    fireEvent.click(screen.getByText(/Approve \(/));

    // Check if confirmation was called
    expect(showConfirmMock).toHaveBeenCalled();

    // Wait for update call
    await waitFor(() => {
      expect(updateSignatory).toHaveBeenCalledWith('123-456', expect.objectContaining({
        status: 'approved',
        Approved: 'Test Admin'
      }));
    });
  });

  it('handles Reject action', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Reject'));

    fireEvent.click(screen.getByText('Reject'));

    // Check if dialog opens
    expect(screen.getByText('Reason for Rejection')).toBeInTheDocument();

    // Enter reason
    const textarea = screen.getByPlaceholderText(/reason for rejecting/i);
    fireEvent.change(textarea, { target: { value: 'Incomplete documents' } });

    // Confirm
    fireEvent.click(screen.getByText('Confirm Rejection'));

    await waitFor(() => {
      expect(updateSignatory).toHaveBeenCalledWith('123-456', expect.objectContaining({
        status: 'rejected',
        REM: expect.stringContaining('Incomplete documents')
      }));
    });
  });

  it('handles Request Changes action', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Request Changes'));

    fireEvent.click(screen.getByText('Request Changes'));

    // Check if dialog opens
    expect(screen.getByText('Feedback / Required Changes')).toBeInTheDocument();

    // Enter feedback
    const textarea = screen.getByPlaceholderText(/changes are needed/i);
    fireEvent.change(textarea, { target: { value: 'Fix boundary coordinates' } });

    // Submit
    fireEvent.click(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(updateSignatory).toHaveBeenCalledWith('123-456', expect.objectContaining({
        status: 'draft',
        REM: expect.stringContaining('Fix boundary coordinates')
      }));
    });
  });
});
