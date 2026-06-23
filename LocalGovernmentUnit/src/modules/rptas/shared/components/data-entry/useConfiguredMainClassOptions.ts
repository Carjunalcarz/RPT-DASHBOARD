import { useEffect, useMemo, useState } from 'react';
import { getMainclassActualUseAssignments, type MainclassActualUseAssignment } from '@/modules/rptas/shared/services/mainclassActualUseService';
import type { MainClassOption } from './MainClassSelect';

const normalizeCode = (v: string) => String(v || '').trim().toUpperCase();

export const useConfiguredMainClassOptions = (municipalityCode: string, classLevel: string, ordinanceNo: string) => {
  const [assignments, setAssignments] = useState<MainclassActualUseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const muni = normalizeCode(municipalityCode);
    const level = String(classLevel || '').trim();
    const ord = String(ordinanceNo || '').trim();

    if (!muni || !level || !ord) {
      setAssignments([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rows = await getMainclassActualUseAssignments({ municipalityCode: muni, classLevel: level, ordinanceNo: ord });
        if (!alive) return;
        setAssignments(rows || []);
      } catch {
        if (!alive) return;
        setAssignments([]);
        setError('Failed to load main class setup');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [classLevel, municipalityCode, ordinanceNo]);

  const options = useMemo<MainClassOption[]>(() => {
    const seen = new Set<string>();
    return (assignments || [])
      .map((a) => ({
        code: normalizeCode(a.mainclass_code),
        description: String(a.mainclass_name || '').trim(),
      }))
      .filter((o) => o.code)
      .filter((o) => (seen.has(o.code) ? false : (seen.add(o.code), true)))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [assignments]);

  return { assignments, options, isLoading, error };
};
