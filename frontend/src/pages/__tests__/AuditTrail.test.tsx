import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import AuditTrail from '../AuditTrail';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock Audit Service
vi.mock('@/services/auditService', () => ({
  getAuditLogs: vi.fn(),
}));

import useSWR from 'swr';

describe('AuditTrail Component', () => {
  it('renders loading skeletons when loading', () => {
    (useSWR as any).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<AuditTrail />);
    // Header + 5 skeletons = 6 rows
    // We can just check if multiple rows exist
    const rows = document.querySelectorAll('tr');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('renders audit logs when data is loaded', () => {
    const mockData = {
      status: 'success',
      source: 'supabase',
      results: 1,
      total: 1,
      page: 1,
      totalPages: 1,
      data: [
        {
          id: 1,
          tableName: 'users',
          recordId: '123',
          action: 'CREATE',
          userId: 'admin',
          ipAddress: '127.0.0.1',
          timestamp: '2024-01-01T12:00:00Z',
          details: { foo: 'bar' },
        },
      ],
    };

    (useSWR as any).mockReturnValue({
      data: mockData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<AuditTrail />);
    
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders error message when error occurs', () => {
    (useSWR as any).mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<AuditTrail />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load audit logs. Please try again later.')).toBeInTheDocument();
  });
});
