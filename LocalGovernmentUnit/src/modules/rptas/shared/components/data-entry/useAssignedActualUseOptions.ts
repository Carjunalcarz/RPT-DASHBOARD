import { useEffect, useMemo, useState } from 'react';
import { getAssignmentByMainClass, type MainclassActualUseAssignment } from '@/modules/rptas/shared/services/mainclassActualUseService';
import type { ActualUseOption } from './ActualUseSelect';

const normalizeCode = (v: string) => String(v || '').trim().toUpperCase();

export const useAssignedActualUseOptions = (params: {
  municipalityCode: string;
  classLevel: string;
  mainClassCode: string;
  ordinanceNo: string;
}) => {
  const [assignment, setAssignment] = useState<MainclassActualUseAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const muni = normalizeCode(params.municipalityCode);
    const level = String(params.classLevel || '').trim();
    const main = normalizeCode(params.mainClassCode);
    const ord = String(params.ordinanceNo || '').trim();

    if (!muni || !level || !main || !ord) {
      setAssignment(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const a = await getAssignmentByMainClass({ municipalityCode: muni, classLevel: level, mainClassCode: main, ordinanceNo: ord });
        if (!alive) return;
        setAssignment(a);
      } catch {
        if (!alive) return;
        setAssignment(null);
        setError('Failed to load actual use setup');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [params.classLevel, params.mainClassCode, params.municipalityCode, params.ordinanceNo]);

  const options = useMemo<ActualUseOption[]>(() => {
    const seen = new Set<string>();
    return (assignment?.actual_uses || [])
      .map((u) => ({
        code: normalizeCode(u.code),
        description: String(u.name || '').trim(),
      }))
      .filter((o) => o.code)
      .filter((o) => (seen.has(o.code) ? false : (seen.add(o.code), true)))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [assignment?.actual_uses]);

  const meta = useMemo(() => {
    return {
      ordinanceNo: assignment?.ordinance_no || null,
      dateApproved: assignment?.date_approved || null,
    };
  }, [assignment?.date_approved, assignment?.ordinance_no]);

  return { assignment, options, meta, isLoading, error };
};
