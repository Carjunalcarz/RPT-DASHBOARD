import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RealPropertyDataEntry from './RealPropertyDataEntry';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { listFaasRecords, saveDraft } from '@/services/faasService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (function() {
  let store: any = {};
  return {
    getItem: vi.fn(function(key: string) {
      return store[key] || null;
    }),
    setItem: vi.fn(function(key: string, value: string) {
      store[key] = value.toString();
    }),
    removeItem: vi.fn(function(key: string) {
      delete store[key];
    }),
    clear: vi.fn(function() {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock hooks
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/context/AlertContext', () => ({
  useAlert: vi.fn(),
}));
vi.mock('@/context/ThemeColorContext', () => ({
  useThemeColor: () => ({ headerColor: '#ffffff' }),
}));

// Mock useIdempotency
vi.mock('@/hooks/useIdempotency', () => ({
  useIdempotency: () => ({
    idempotencyKey: 'mock-key',
    refreshKey: vi.fn(),
    getKey: vi.fn(),
  }),
}));

// Mock SWR
vi.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: { data: [], pagination: { total: 0, totalPages: 1 } },
    error: null,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  }),
}));

// Mock services
vi.mock('@/services/rptMastService', () => ({
    getRptMastDataDirect: vi.fn(),
    getMastExtn: vi.fn(),
}));
vi.mock('@/services/rptAssService', () => ({
    getRptAssByTdn: vi.fn(),
}));
vi.mock('@/services/faasService', () => ({
    listFaasRecords: vi.fn(),
    saveDraft: vi.fn(),
    submitForReview: vi.fn(),
    getFaasRecord: vi.fn(),
    deleteFaasRecord: vi.fn(),
    cancelFaasTransaction: vi.fn(),
}));

// Mock child components
vi.mock('./PropertyInformationSection', () => ({
  default: function DummyPropertyInformationSection({ onUpdate, selectedRecord }: any) {
    return (
      <div data-testid="property-info-section">
        <div data-testid="record-tdn">{selectedRecord?.TDN || selectedRecord?.tdn}</div>
        <button data-testid="btn-update-tdn" onClick={() => {
            onUpdate({ TDN: 'duplicate-draft' });
        }}>Set TDN</button>
      </div>
    );
  }
}));
vi.mock('./PropertyOwnerSection', () => ({ default: () => <div>Owner</div> }));
vi.mock('./PropertyBoundariesSection', () => ({ default: () => <div>Boundaries</div> }));
vi.mock('./AssessmentSection', () => ({ default: () => <div>Assessment</div> }));
vi.mock('./ReferenceSection', () => ({ default: () => <div>Reference</div> }));
vi.mock('./SignatoriesSection', () => ({ default: () => <div>Signatories</div> }));
vi.mock('./PreviousTDNsSection', () => ({ default: () => <div>PreviousTDNs</div> }));
vi.mock('./TaxDecSheetSection', () => ({ default: () => <div>TaxDecSheet</div> }));
vi.mock('../OtherPropertyTab', () => ({ default: () => <div>OtherPropertyTab</div> }));

describe('RealPropertyDataEntry Duplicate Handling', () => {
  const mockUser = { name: 'Test Admin', role: 'admin', position: 'Administrator' };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (useAlert as any).mockReturnValue({ showConfirm: vi.fn().mockResolvedValue(true) });
    (listFaasRecords as any).mockResolvedValue({ data: [] });
    (saveDraft as any).mockResolvedValue({ id: 'new-id-123', status: 'draft' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('updates existing draft instead of creating new one when TDN matches', async () => {
    // Mock setup: 
    // 1. listFaasRecords should return an existing draft when queried with 'duplicate-draft'
    (listFaasRecords as any).mockImplementation(async ({ filterValue }: any) => {
        if (filterValue === 'duplicate-draft') {
            return { 
                data: [{ 
                    id: 'existing-draft-id', 
                    status: 'draft', 
                    data: { TDN: 'duplicate-draft' } 
                }] 
            };
        }
        return { data: [] };
    });

    (saveDraft as any).mockResolvedValue({ id: 'existing-draft-id', status: 'draft' });

    render(<RealPropertyDataEntry />);

    // 1. Click Add to start a new transaction (Temp ID)
    fireEvent.click(screen.getByTestId('btn-add'));

    // Wait for view
    await waitFor(() => expect(screen.getByTestId('property-info-section')).toBeInTheDocument());

    // 2. Simulate entering a TDN that already exists as a draft
    await act(async () => {
        fireEvent.click(screen.getByTestId('btn-update-tdn'));
    });
    await screen.findByText('duplicate-draft'); // Ensure state is updated

    // 3. Click Save Draft (using the real button in the toolbar)
    const saveBtn = screen.getByText('Save Draft'); // or getByTitle('Save as Draft (Work in Progress)')
    fireEvent.click(saveBtn);

    // 4. Assertions
    await waitFor(() => {
        // listFaasRecords should be called to check PIN/TDN
        expect(listFaasRecords).toHaveBeenCalledWith(expect.objectContaining({ 
            searchField: 'TDN', 
            filterValue: 'duplicate-draft' 
        }));
        
        // saveDraft should be called with the EXISTING ID, not undefined
        expect(saveDraft).toHaveBeenCalledWith(
            expect.objectContaining({ TDN: 'duplicate-draft' }), 
            'existing-draft-id', 
            'mock-key' 
        );
    });
  });

  it('creates new record if no duplicate draft exists', async () => {
    // Mock setup: No duplicates
    (listFaasRecords as any).mockResolvedValue({ data: [] });
    (saveDraft as any).mockResolvedValue({ id: 'new-created-id', status: 'draft' });

    render(<RealPropertyDataEntry />);

    // 1. Click Add
    fireEvent.click(screen.getByTestId('btn-add'));
    await waitFor(() => expect(screen.getByTestId('property-info-section')).toBeInTheDocument());

    // 2. Enter TDN
    await act(async () => {
        fireEvent.click(screen.getByTestId('btn-update-tdn'));
    });
    await screen.findByText('duplicate-draft'); // Ensure state is updated

    // 3. Save
    const saveBtn = screen.getByText('Save Draft');
    fireEvent.click(saveBtn);

    // 4. Assertions
    await waitFor(() => {
        // saveDraft should be called with undefined ID (create new)
        expect(saveDraft).toHaveBeenCalledWith(
            expect.objectContaining({ TDN: 'duplicate-draft' }), 
            undefined,
            'mock-key'
        );
    });
  });
});
