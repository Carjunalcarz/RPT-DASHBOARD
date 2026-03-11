import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropertyApproval from '../PropertyApproval';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { getRptMastDataDirect, updateSignatory } from '@/services/rptMastService';
import { getRptAssByTdn } from '@/services/rptAssService';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock hooks
jest.mock('@/context/AuthContext');
jest.mock('@/context/AlertContext');
jest.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#ffffff' }),
}));

// Mock services
jest.mock('@/services/rptMastService');
jest.mock('@/services/rptAssService');

// Mock child components to avoid deep rendering issues
jest.mock('@/components/RPT-management/faas/rpt_m_PropertyDetailsView', () => {
  return function DummyPropertyDetailsView() {
    return <div data-testid="property-details-view">Property Details</div>;
  };
});

describe('PropertyApproval Page', () => {
  const mockUser = { name: 'Test Admin', role: 'admin', position: 'Administrator' };
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
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useAlert as jest.Mock).mockReturnValue({ showConfirm: jest.fn().mockResolvedValue(true) });
    (getRptMastDataDirect as jest.Mock).mockResolvedValue({
      data: [{ id: '1', tdn: '123-456', status: 'for-review', data: mockRecord.data }]
    });
    (getRptAssByTdn as jest.Mock).mockResolvedValue([]);
    (updateSignatory as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/property-approval/123-456']}>
        <Routes>
          <Route path="/property-approval/:tdn" element={<PropertyApproval />} />
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
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Request Changes')).toBeInTheDocument();
  });

  it('handles Approve action', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Approve'));

    fireEvent.click(screen.getByText('Approve'));

    // Check if confirmation was called
    const { showConfirm } = useAlert();
    expect(showConfirm).toHaveBeenCalled();

    // Wait for update call
    await waitFor(() => {
      expect(updateSignatory).toHaveBeenCalledWith('123-456', expect.objectContaining({
        status: 'approved',
        SGD_APPROVED: true
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
