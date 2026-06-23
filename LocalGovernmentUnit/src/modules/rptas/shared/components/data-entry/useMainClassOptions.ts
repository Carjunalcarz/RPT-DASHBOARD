import { useEffect, useMemo, useState } from 'react';
import { getClassifications, Classification } from '@/modules/rptas/shared/services/classificationService';
import { getCustomMainClasses } from '@/modules/rptas/shared/services/mainClassCustomService';
import { MainClassOption } from './MainClassSelect';

const mergeOptions = (base: Classification[], custom: Array<{ code: string; description: string }>): MainClassOption[] => {
  const merged = [
    ...(base || []).map((c) => ({
      code: String(c.Code || '').trim().toUpperCase(),
      description: String(c.Description || '').trim(),
    })),
    ...(custom || []).map((c) => ({
      code: String(c.code || '').trim().toUpperCase(),
      description: String(c.description || '').trim(),
    })),
  ].filter((o) => o.code);

  const seen = new Set<string>();
  return merged
    .filter((o) => (seen.has(o.code) ? false : (seen.add(o.code), true)))
    .sort((a, b) => a.code.localeCompare(b.code));
};

export const useMainClassOptions = () => {
  const [options, setOptions] = useState<MainClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [base, custom] = await Promise.all([getClassifications(), getCustomMainClasses()]);
        if (!alive) return;
        setOptions(mergeOptions(base || [], (custom || []).map((c) => ({ code: c.code, description: c.description }))));
      } catch {
        if (!alive) return;
        setOptions([]);
        setError('Failed to load main classes');
      } finally {
        if (!alive) return;
        setIsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const codes = useMemo(() => new Set(options.map((o) => o.code)), [options]);

  return { options, codes, isLoading, error };
};

