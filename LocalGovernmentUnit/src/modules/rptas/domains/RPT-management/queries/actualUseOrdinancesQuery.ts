import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getActualUseOrdinances, type ActualUseOrdinance } from '@/modules/rptas/shared/services/actualUseOrdinanceService';

export const actualUseOrdinancesQueryKey = ['rptas', 'actualUseOrdinances', 'all'] as const;

export const prefetchActualUseOrdinances = async (queryClient: QueryClient) => {
  await queryClient.prefetchQuery({
    queryKey: actualUseOrdinancesQueryKey,
    queryFn: ({ signal }) => getActualUseOrdinances({}, { signal }),
    staleTime: 10 * 60 * 1000,
  });
};

export const usePrefetchActualUseOrdinances = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const isMockMode =
      typeof window !== 'undefined' &&
      typeof window.localStorage?.getItem === 'function' &&
      window.localStorage.getItem('auth_mode') === 'mock';
    const hasApiKey = Boolean(import.meta.env.VITE_API_ACCESS_KEY);
    if (isMockMode || !hasApiKey) return;

    const run = async () => {
      try {
        await prefetchActualUseOrdinances(queryClient);
      } catch (err) {
        console.error('Failed to prefetch actual use ordinances', err);
      }
    };
    run();
  }, [queryClient]);
};

export const useActualUseOrdinances = () => {
  const isMockMode =
    typeof window !== 'undefined' &&
    typeof window.localStorage?.getItem === 'function' &&
    window.localStorage.getItem('auth_mode') === 'mock';
  const hasApiKey = Boolean(import.meta.env.VITE_API_ACCESS_KEY);

  return useQuery<ActualUseOrdinance[]>({
    queryKey: actualUseOrdinancesQueryKey,
    queryFn: ({ signal }) => getActualUseOrdinances({}, { signal }),
    staleTime: 10 * 60 * 1000,
    enabled: !isMockMode && hasApiKey,
  });
};
