import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssessmentSection from './AssessmentSection';

let lastLandProps: any;
let lastBuildingProps: any;
let lastMachineryProps: any;

vi.mock('../land', () => ({
  LandAssessment: (props: any) => {
    lastLandProps = props;
    return <div data-testid="land-assessment" />;
  },
}));

vi.mock('../building', () => ({
  BuildingAssessment: (props: any) => {
    lastBuildingProps = props;
    return <div data-testid="building-assessment" />;
  },
}));

vi.mock('../machinery', () => ({
  MachineryAssessment: (props: any) => {
    lastMachineryProps = props;
    return <div data-testid="machinery-assessment" />;
  },
}));

describe('data-entry AssessmentSection (alignment with RPT-management)', () => {
  beforeEach(() => {
    lastLandProps = undefined;
    lastBuildingProps = undefined;
    lastMachineryProps = undefined;
  });

  it('auto-selects the correct assessment type based on first record', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <AssessmentSection
          assessmentRecords={[{ TDN: 'TDN-B', KIND: 'B', CLASSIFICATION: 'X' } as any]}
          isLoading={false}
          isEnabled={true}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('building-assessment')).toBeInTheDocument();
  });

  it('attaches matching trees to land records before passing to LandAssessment', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <AssessmentSection
          assessmentRecords={[{ TDN: 'TDN-L', KIND: 'L', CLASSIFICATION: 'A' } as any]}
          trees={[{ TDN: 'TDN-L', Prod_Code: 'T01' }]}
          isLoading={false}
          isEnabled={true}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('land-assessment')).toBeInTheDocument();
    expect(lastLandProps.records[0].trees.length).toBe(1);
  });

  it('merges updated land records with other assessment records when onUpdate fires', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onUpdate = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <AssessmentSection
          assessmentRecords={[
            { TDN: 'TDN-L', KIND: 'L', CLASSIFICATION: 'A' } as any,
            { TDN: 'TDN-B', KIND: 'B', CLASSIFICATION: 'B1' } as any,
          ]}
          isLoading={false}
          isEnabled={true}
          onUpdate={onUpdate}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('land-assessment')).toBeInTheDocument();

    await act(async () => {
      lastLandProps.onUpdate([{ TDN: 'TDN-L', KIND: 'L', CLASSIFICATION: 'A2' }]);
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const merged = onUpdate.mock.calls[0][0] as any[];
    expect(merged.some((r) => r.KIND === 'B' && r.TDN === 'TDN-B')).toBe(true);
    expect(merged.some((r) => r.KIND === 'L' && r.TDN === 'TDN-L' && r.CLASSIFICATION === 'A2')).toBe(true);
  });
});

