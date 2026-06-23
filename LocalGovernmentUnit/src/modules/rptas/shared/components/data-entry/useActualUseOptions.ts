import { useEffect, useMemo, useState } from 'react';
import { getActualUses, ActualUse } from '@/modules/rptas/shared/services/classificationService';
import { getCustomActualUses } from '@/modules/rptas/shared/services/actualUseCustomService';
import { ActualUseOption } from './ActualUseSelect';

const mergeOptions = (base: ActualUse[], custom: Array<{ code: string; description: string }>): ActualUseOption[] => {
  const merged = [
    ...(base || []).map((u) => ({
      code: String(u.Code || '').trim().toUpperCase(),
      description: String(u.Description || '').trim(),
    })),
    ...(custom || []).map((u) => ({
      code: String(u.code || '').trim().toUpperCase(),
      description: String(u.description || '').trim(),
    })),
  ].filter((o) => o.code);

  const seen = new Set<string>();
  return merged
    .filter((o) => (seen.has(o.code) ? false : (seen.add(o.code), true)))
    .sort((a, b) => a.code.localeCompare(b.code));
};

export const useActualUseOptions = (mainClassCode: string) => {
  const [options, setOptions] = useState<ActualUseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const main = String(mainClassCode || '').trim().toUpperCase();
    if (!main) {
      setOptions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [base, custom] = await Promise.all([
          getActualUses({ pageSize: 2000, mainClass: main }),
          getCustomActualUses({ mainClass: main }),
        ]);
        if (!alive) return;
        setOptions(mergeOptions(base || [], (custom || []).map((c) => ({ code: c.code, description: c.description }))));
      } catch {
        if (!alive) return;
        setOptions([]);
        setError('Failed to load actual uses');
      } finally {
        if (!alive) return;
        setIsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [mainClassCode]);

  const codes = useMemo(() => new Set(options.map((o) => o.code)), [options]);

  return { options, codes, isLoading, error };
};

