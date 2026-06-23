import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/modules/rptas/ui/card';
import { Button } from '@/modules/rptas/ui/button';
import { Badge } from '@/modules/rptas/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/rptas/ui/select';
import { Checkbox } from '@/modules/rptas/ui/checkbox';
import { Label } from '@/modules/rptas/ui/label';
import { Input } from '@/modules/rptas/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/modules/rptas/ui/dialog';
import { Loader2, Tag, Save, Trash2, Edit, Pencil } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getClassifications, getActualUses, Classification, ActualUse } from '../../../shared/services/classificationService';
import { getCities, CityRecord } from '../../../shared/services/cityService';
import { getClassificationRates, upsertClassificationRate, ClassificationRate } from '../../../shared/services/classificationRateService';
import { getActualUseOrdinances, upsertActualUseOrdinance, ActualUseOrdinance } from '../../../shared/services/actualUseOrdinanceService';
import { upsertCustomActualUse, getCustomActualUses, deleteCustomActualUse, CustomActualUse } from '../../../shared/services/actualUseCustomService';
import { getCustomMainClasses, upsertCustomMainClass, deleteCustomMainClass, CustomMainClass } from '../../../shared/services/mainClassCustomService';
import { getActualUseRates, upsertActualUseRate, ActualUseRate } from '../../../shared/services/actualUseRateService';
import { 
  getMainclassActualUseAssignments, 
  upsertMainclassActualUseAssignment, 
  deleteMainclassActualUseAssignment,
  MainclassActualUseAssignment 
} from '../../../shared/services/mainclassActualUseService';
import { filterMembersByMainClass } from '../utils/classFilter';
import { normalizeMainClassCode } from '../utils/normalizeMainClassCode';

const toRateNumber = (value: string): number | null => {
  const v = value.trim();
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return n;
};

const ActualUseSetupPage: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();

  const [municipalities, setMunicipalities] = useState<CityRecord[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState('');
  const [selectedClassLevel, setSelectedClassLevel] = useState('');
  const [ordinanceNo, setOrdinanceNo] = useState('');
  const [dateApproved, setDateApproved] = useState('');
  const [ordinances, setOrdinances] = useState<ActualUseOrdinance[]>([]);
  const [isLoadingOrdinances, setIsLoadingOrdinances] = useState(false);
  const [newOrdinanceNo, setNewOrdinanceNo] = useState('');
  const [newDateApproved, setNewDateApproved] = useState('');
  const [isAddingOrdinance, setIsAddingOrdinance] = useState(false);
  const [setupErrors, setSetupErrors] = useState<{ municipality?: string; classLevel?: string; ordinanceNo?: string; dateApproved?: string }>({});
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [customMainClasses, setCustomMainClasses] = useState<CustomMainClass[]>([]);
  const [classificationRates, setClassificationRates] = useState<ClassificationRate[]>([]);
  const [allActualUses, setAllActualUses] = useState<ActualUse[]>([]); // Cache all actual uses
  const [actualUses, setActualUses] = useState<ActualUse[]>([]); // Filtered subset
  const [customActualUses, setCustomActualUses] = useState<CustomActualUse[]>([]);
  const [assignments, setAssignments] = useState<MainclassActualUseAssignment[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);
  
  const [selectedMainClass, setSelectedMainClass] = useState<string>('');
  const [selectedActualUses, setSelectedActualUses] = useState<string[]>([]);
  const [mainClassRateDraft, setMainClassRateDraft] = useState('');
  const [isSavingMainClassRate, setIsSavingMainClassRate] = useState(false);
  const [viewAllAssignment, setViewAllAssignment] = useState<MainclassActualUseAssignment | null>(null);
  const [viewAllSearch, setViewAllSearch] = useState('');
  const [newMainClassCode, setNewMainClassCode] = useState('');
  const [newMainClassName, setNewMainClassName] = useState('');
  const [isAddingMainClass, setIsAddingMainClass] = useState(false);
  const [editMainClassCode, setEditMainClassCode] = useState('');
  const [editMainClassName, setEditMainClassName] = useState('');
  const [isEditingMainClass, setIsEditingMainClass] = useState(false);
  const [newActualUseCode, setNewActualUseCode] = useState('');
  const [newActualUseDescription, setNewActualUseDescription] = useState('');
  const [isAddingActualUse, setIsAddingActualUse] = useState(false);
  const [editActualUseId, setEditActualUseId] = useState('');
  const [editActualUseCode, setEditActualUseCode] = useState('');
  const [editActualUseMainClass, setEditActualUseMainClass] = useState('');
  const [editActualUseDescription, setEditActualUseDescription] = useState('');
  const [isEditingActualUse, setIsEditingActualUse] = useState(false);
  
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingActualUses, setIsLoadingActualUses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [actualUseRates, setActualUseRates] = useState<ActualUseRate[]>([]);
  const [isLoadingActualUseRates, setIsLoadingActualUseRates] = useState(false);
  const [rateDraftHa, setRateDraftHa] = useState<Record<string, string>>({});
  const [rateDraftSqm, setRateDraftSqm] = useState<Record<string, string>>({});
  const [savingRateKey, setSavingRateKey] = useState<string>('');
  const [bulkRateEnabled, setBulkRateEnabled] = useState(false);
  const [bulkHa, setBulkHa] = useState('');
  const [bulkSqm, setBulkSqm] = useState('');
  const [isSavingBulkRates, setIsSavingBulkRates] = useState(false);

  const ordinancesCacheRef = useRef<Map<string, ActualUseOrdinance[]>>(new Map());
  const ordinancesAbortRef = useRef<AbortController | null>(null);

  const customMainClassCodes = useMemo(() => {
    return new Set((customMainClasses || []).map((c) => String(c.code || '').trim().toUpperCase()).filter(Boolean));
  }, [customMainClasses]);

  const customActualUseByKey = useMemo(() => {
    const map = new Map<string, CustomActualUse>();
    (customActualUses || []).forEach((u) => {
      const key = `${String(u.mainclass_code || '').trim()}|${String(u.code || '').trim().toUpperCase()}`;
      map.set(key, u);
    });
    return map;
  }, [customActualUses]);

  const rateContextKey = useMemo(() => {
    return `${String(selectedMunicipalityCode || '').trim()}|${String(selectedClassLevel || '').trim()}|${String(ordinanceNo || '').trim()}`;
  }, [ordinanceNo, selectedClassLevel, selectedMunicipalityCode]);

  const actualUseRateMap = useMemo(() => {
    const map = new Map<string, number | null>();
    (actualUseRates || []).forEach((r) => {
      const main = String(r.mainclass_code || '').trim();
      const code = String(r.actualuse_code || '').trim().toUpperCase();
      if (!main || !code) return;
      map.set(`${rateContextKey}|${main}|${code}`, r.rate ?? null);
    });
    return map;
  }, [actualUseRates, rateContextKey]);

  const formatRateNumber = (n: number): string => {
    if (!Number.isFinite(n)) return '';
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(6).replace(/\.?0+$/, '');
  };

  const toRateValue = (value: string): number | null => {
    const v = value.trim();
    if (v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || Number.isNaN(n)) return null;
    return n;
  };

  const assignmentsByMainClass = useMemo(() => {
    const map = new Map<string, MainclassActualUseAssignment>();
    (assignments || []).forEach((a) => {
      const code = String(a.mainclass_code || '').trim();
      if (code) map.set(code, a);
    });
    return map;
  }, [assignments]);

  const mainClassRows = useMemo(() => {
    const rows = (classifications || [])
      .map((cls) => {
        const code = String(cls.Code || '').trim();
        const normalizedCode = normalizeMainClassCode(code);
        const assignment = assignmentsByMainClass.get(normalizedCode) || assignmentsByMainClass.get(code) || null;
        return {
          code: normalizedCode || code,
          name: String(cls.Description || '').trim(),
          assignment,
        };
      })
      .filter((r) => r.code)
      .sort((a, b) => a.code.localeCompare(b.code));

    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
  }, [classifications, assignmentsByMainClass]);

  // Fetch initial data
  useEffect(() => {
    const hydrateSetup = async () => {
      try {
        const raw = localStorage.getItem('rptas_actual_use_context');
        const parsed = raw ? JSON.parse(raw) : null;
        const municipality = String(parsed?.municipalityCode || '').trim();
        const classLevel = String(parsed?.classLevel || '').trim();
        const ord = String(parsed?.ordinanceNo || '').trim();
        const date = String(parsed?.dateApproved || '').trim();

        if (municipality) setSelectedMunicipalityCode(municipality);
        if (classLevel) setSelectedClassLevel(classLevel);
        if (ord) setOrdinanceNo(ord);
        if (date) setDateApproved(date);
        if (municipality && classLevel && ord && date) setIsSetupComplete(true);
      } catch {
        // ignore
      }
    };

    const loadAllMunicipalities = async () => {
      setIsLoadingMunicipalities(true);
      try {
        const all: CityRecord[] = [];
        let page = 1;
        let totalPages = 1;
        const pageSize = 500;

        while (page <= totalPages) {
          const res = await getCities(page, pageSize);
          all.push(...(res.data || []));
          totalPages = res.meta?.totalPages || 1;
          page += 1;
        }

        const deduped = Array.from(
          new Map(all.map((c) => [String(c.CODE || '').trim(), { ...c, CODE: String(c.CODE || '').trim() }])).values()
        )
          .filter((c) => c.CODE)
          .sort((a, b) => String(a.DESCRIPTION || '').localeCompare(String(b.DESCRIPTION || '')));

        setMunicipalities(deduped);
      } finally {
        setIsLoadingMunicipalities(false);
      }
    };

    hydrateSetup();
    loadAllMunicipalities();
  }, []);

  useEffect(() => {
    const loadOrdinances = async () => {
      const muni = String(selectedMunicipalityCode || '').trim();
      const level = String(selectedClassLevel || '').trim();
      const cacheKey = muni && level ? `${muni}|${level}` : `ALL`;
      const cached = ordinancesCacheRef.current.get(cacheKey);
      if (cached && cached.length > 0) {
        setOrdinances(cached);
        return;
      }

      ordinancesAbortRef.current?.abort();
      const controller = new AbortController();
      ordinancesAbortRef.current = controller;

      setIsLoadingOrdinances(true);
      try {
        const data = await getActualUseOrdinances(
          muni && level ? { municipalityCode: muni, classLevel: level } : {},
          { signal: controller.signal }
        );
        const next = data || [];
        ordinancesCacheRef.current.set(cacheKey, next);
        setOrdinances(next);
      } catch {
        setOrdinances([]);
      } finally {
        setIsLoadingOrdinances(false);
      }
    };

    loadOrdinances();
  }, [selectedMunicipalityCode, selectedClassLevel]);

  useEffect(() => {
    if (isSetupComplete && selectedMunicipalityCode && selectedClassLevel) {
      fetchInitialData();
    }
  }, [isSetupComplete, selectedMunicipalityCode, selectedClassLevel]);

  const fetchInitialData = async () => {
    setIsLoadingClasses(true);
    setIsLoadingAssignments(true);
    setIsLoadingActualUses(true);
    setIsLoadingActualUseRates(true);
    try {
      const [classesRes, assignmentsRes, actualUsesRes, classRatesRes, ratesRes] = await Promise.all([
        getClassifications(),
        getMainclassActualUseAssignments({ municipalityCode: selectedMunicipalityCode, classLevel: selectedClassLevel, ordinanceNo }),
        getActualUses({ pageSize: 1000 }), // Pre-fetch all actual uses for client-side filtering
        getClassificationRates(),
        getActualUseRates({ municipalityCode: selectedMunicipalityCode, classLevel: selectedClassLevel, ordinanceNo }),
      ]);
      const custom = await getCustomActualUses();
      const customMainClasses = await getCustomMainClasses();
      const mergedMainClasses = [...(classesRes || []), ...(customMainClasses || []).map((c) => ({
        Code: String(c.code || '').trim().toUpperCase(),
        Description: String(c.description || '').trim(),
      }))]
        .filter((c) => c.Code)
        .filter((c, idx, arr) => arr.findIndex((x) => String(x.Code).trim().toUpperCase() === String(c.Code).trim().toUpperCase()) === idx)
        .sort((a, b) => String(a.Code).localeCompare(String(b.Code)));

      setClassifications(mergedMainClasses);
      setCustomMainClasses(customMainClasses || []);
      setAssignments(assignmentsRes || []);
      setCustomActualUses(custom || []);
      setActualUseRates(ratesRes || []);
      const customAsActualUse: ActualUse[] = (custom || []).map((c) => ({
        REGION: '',
        PROV: '',
        CITY: '',
        MainClass: String(c.mainclass_code || '').trim(),
        Code: String(c.code || '').trim(),
        Description: String(c.description || '').trim(),
        ForSelection: 1,
      }));
      const merged = [...(actualUsesRes || []), ...customAsActualUse]
        .filter((u) => u.MainClass && u.Code)
        .filter(
          (u, idx, arr) =>
            arr.findIndex((x) => String(x.MainClass).trim() === String(u.MainClass).trim() && String(x.Code).trim() === String(u.Code).trim()) === idx
        );
      setAllActualUses(merged);
      setClassificationRates(classRatesRes || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showAlert('Failed to load initial data.');
    } finally {
      setIsLoadingClasses(false);
      setIsLoadingAssignments(false);
      setIsLoadingActualUses(false);
      setIsLoadingActualUseRates(false);
    }
  };

  useEffect(() => {
    const code = normalizeMainClassCode(selectedMainClass);
    if (!code) {
      setMainClassRateDraft('');
      return;
    }
    const existing = classificationRates.find((r) => String(r.code).trim() === code);
    setMainClassRateDraft(existing?.rate === null || existing?.rate === undefined ? '' : String(existing.rate));
  }, [selectedMainClass, classificationRates]);

  useEffect(() => {
    const main = normalizeMainClassCode(selectedMainClass);
    if (!main) return;

    setRateDraftHa((prev) => {
      const next = { ...prev };

      (actualUseRates || [])
        .filter((r) => String(r.mainclass_code || '').trim() === main)
        .forEach((r) => {
          const key = `${rateContextKey}|${main}|${String(r.actualuse_code || '').trim().toUpperCase()}`;
          next[key] = r.rate === null || r.rate === undefined ? '' : String(r.rate);
        });

      (actualUses || [])
        .filter((u) => String((u.MainClass || '').trim()) === main)
        .forEach((u) => {
          const key = `${rateContextKey}|${main}|${String(u.Code || '').trim().toUpperCase()}`;
          if (next[key] === undefined) next[key] = '';
        });

      return next;
    });

    setRateDraftSqm((prev) => {
      const next = { ...prev };

      (actualUseRates || [])
        .filter((r) => String(r.mainclass_code || '').trim() === main)
        .forEach((r) => {
          const key = `${rateContextKey}|${main}|${String(r.actualuse_code || '').trim().toUpperCase()}`;
          const ha = r.rate === null || r.rate === undefined ? null : Number(r.rate);
          next[key] = ha === null || !Number.isFinite(ha) ? '' : formatRateNumber(ha / 10000);
        });

      (actualUses || [])
        .filter((u) => String((u.MainClass || '').trim()) === main)
        .forEach((u) => {
          const key = `${rateContextKey}|${main}|${String(u.Code || '').trim().toUpperCase()}`;
          if (next[key] === undefined) next[key] = '';
        });

      return next;
    });
  }, [selectedMainClass, actualUseRates, actualUses]);

  const handleSaveMainClassRate = async () => {
    const code = normalizeMainClassCode(selectedMainClass);
    if (!code) {
      showAlert('Please select a Main Class first.');
      return;
    }

    const raw = mainClassRateDraft ?? '';
    const rateValue = toRateNumber(raw);
    if (raw.trim() !== '' && rateValue === null) {
      showAlert('Rate must be a valid number.');
      return;
    }
    if (rateValue !== null && rateValue < 0) {
      showAlert('Rate must be 0 or greater.');
      return;
    }

    const cls = classifications.find((c) => String(c.Code).trim() === code);
    const name = String(cls?.Description || '').trim() || code;

    setIsSavingMainClassRate(true);
    try {
      const saved = await upsertClassificationRate(code, name, rateValue);
      setClassificationRates((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id || String(p.code).trim() === String(saved.code).trim());
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev.filter((p) => String(p.code).trim() !== String(saved.code).trim()), saved];
      });
      showAlert('Main class rate saved.');
    } catch {
      showAlert('Failed to save main class rate.');
    } finally {
      setIsSavingMainClassRate(false);
    }
  };

  const handleSaveSetup = async () => {
    const nextErrors: { municipality?: string; classLevel?: string; ordinanceNo?: string; dateApproved?: string } = {};
    if (!selectedMunicipalityCode) nextErrors.municipality = 'Please select a municipality.';
    if (!selectedClassLevel) nextErrors.classLevel = 'Please select a class level (1st to 4th grade).';
    if (!ordinanceNo.trim() && !newOrdinanceNo.trim()) nextErrors.ordinanceNo = 'Select an ordinance or add a new one.';
    if (!dateApproved.trim() && !newDateApproved.trim()) nextErrors.dateApproved = 'Select an ordinance or add a new one.';
    setSetupErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSavingSetup(true);
    try {
      const normalizedMunicipality = String(selectedMunicipalityCode).trim();
      const normalizedClassLevel = String(selectedClassLevel).trim();
      let normalizedOrdinanceNo = ordinanceNo.trim();
      let normalizedDateApproved = dateApproved.trim();

      if (!normalizedOrdinanceNo) {
        const ord = newOrdinanceNo.trim();
        const date = newDateApproved.trim();
        const saved = await upsertActualUseOrdinance(normalizedMunicipality, normalizedClassLevel, ord, date);

        const nextOrdinances = [
          saved,
          ...(ordinances || []).filter(
            (o) =>
              !(String(o.ordinance_no) === String(saved.ordinance_no) &&
                String(o.municipality_code) === String(saved.municipality_code) &&
                String(o.class_level) === String(saved.class_level))
          ),
        ].sort((a, b) => String(b.date_approved || '').localeCompare(String(a.date_approved || '')));

        ordinancesCacheRef.current.set(`${normalizedMunicipality}|${normalizedClassLevel}`, nextOrdinances);
        setOrdinances(nextOrdinances);
        setOrdinanceNo(saved.ordinance_no);
        setDateApproved(String(saved.date_approved || '').slice(0, 10));
        setNewOrdinanceNo('');
        setNewDateApproved('');

        normalizedOrdinanceNo = saved.ordinance_no;
        normalizedDateApproved = String(saved.date_approved || '').slice(0, 10);
      }

      try {
        const next = {
          municipalityCode: normalizedMunicipality,
          classLevel: normalizedClassLevel,
          ordinanceNo: normalizedOrdinanceNo,
          dateApproved: normalizedDateApproved,
        };
        localStorage.setItem('rptas_actual_use_context', JSON.stringify(next));
      } catch {
        // ignore
      }

      setIsSetupComplete(true);
      showAlert('Context saved.');
    } catch (e) {
      showAlert('Failed to save setup.');
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleAddOrdinance = async () => {
    const ord = newOrdinanceNo.trim();
    const date = newDateApproved.trim();

    const nextErrors: { ordinanceNo?: string; dateApproved?: string } = {};
    if (!ord) nextErrors.ordinanceNo = 'Ordinance No. is required.';
    if (!date) nextErrors.dateApproved = 'Date Approved is required.';
    setSetupErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) return;

    setIsAddingOrdinance(true);
    try {
      const muni = String(selectedMunicipalityCode || '').trim() || 'ALL';
      const level = String(selectedClassLevel || '').trim() || 'ALL';
      await upsertActualUseOrdinance(muni, level, ord, date);
      const refreshed = await getActualUseOrdinances(
        muni !== 'ALL' && level !== 'ALL' ? { municipalityCode: muni, classLevel: level } : {}
      );
      const next = refreshed || [];
      ordinancesCacheRef.current.set(muni !== 'ALL' && level !== 'ALL' ? `${muni}|${level}` : `ALL`, next);
      setOrdinances(next);
      setOrdinanceNo(ord);
      setDateApproved(date);
      setNewOrdinanceNo('');
      setNewDateApproved('');
      showAlert('Ordinance saved.');
    } catch {
      showAlert('Failed to save ordinance.');
    } finally {
      setIsAddingOrdinance(false);
    }
  };

  const handleAddMainClass = async () => {
    const code = newMainClassCode.trim().toUpperCase();
    const name = newMainClassName.trim();
    if (!code) {
      showAlert('Main Class Code is required.');
      return;
    }
    if (!name) {
      showAlert('Main Class Name is required.');
      return;
    }

    const exists = (classifications || []).some((c) => String(c.Code || '').trim().toUpperCase() === code);
    if (exists) {
      showAlert('Main Class already exists.');
      return;
    }

    setIsAddingMainClass(true);
    try {
      await upsertCustomMainClass(code, name);
      setClassifications((prev) => {
        const next = [...(prev || []), { Code: code, Description: name }];
        return next
          .filter((c) => c.Code)
          .filter((c, idx, arr) => arr.findIndex((x) => String(x.Code).trim().toUpperCase() === String(c.Code).trim().toUpperCase()) === idx)
          .sort((a, b) => String(a.Code).localeCompare(String(b.Code)));
      });
      setSelectedMainClass(code);
      setNewMainClassCode('');
      setNewMainClassName('');
      showAlert('Main Class added.');
    } catch {
      showAlert('Failed to add main class.');
    } finally {
      setIsAddingMainClass(false);
    }
  };

  const handleOpenEditMainClass = (code: string, name: string) => {
    setEditMainClassCode(String(code || '').trim().toUpperCase());
    setEditMainClassName(String(name || '').trim());
  };

  const handleSaveEditMainClass = async () => {
    const code = editMainClassCode.trim().toUpperCase();
    const name = editMainClassName.trim();
    if (!code) {
      showAlert('Main Class Code is required.');
      return;
    }
    if (!name) {
      showAlert('Main Class Name is required.');
      return;
    }

    setIsEditingMainClass(true);
    try {
      await upsertCustomMainClass(code, name);
      setCustomMainClasses((prev) => {
        const existing = (prev || []).filter((c) => String(c.code || '').trim().toUpperCase() !== code);
        return [...existing, { id: '', code, description: name, created_at: '', updated_at: '' } as any];
      });
      setClassifications((prev) =>
        (prev || [])
          .map((c) => (String(c.Code || '').trim().toUpperCase() === code ? { ...c, Description: name } : c))
          .sort((a, b) => String(a.Code).localeCompare(String(b.Code)))
      );
      setEditMainClassCode('');
      setEditMainClassName('');
      showAlert('Main Class updated.');
    } catch {
      showAlert('Failed to update main class.');
    } finally {
      setIsEditingMainClass(false);
    }
  };

  const handleDeleteMainClass = async (code: string) => {
    const c = String(code || '').trim().toUpperCase();
    const hasAssignment = Boolean(assignmentsByMainClass.get(c) || assignmentsByMainClass.get(normalizeMainClassCode(c)));
    if (hasAssignment) {
      showAlert('Remove the configuration first before deleting this Main Class.');
      return;
    }

    const ok = await showConfirm(`Delete Main Class ${c}?`);
    if (!ok) return;

    try {
      await deleteCustomMainClass(c);
      setCustomMainClasses((prev) => (prev || []).filter((x) => String(x.code || '').trim().toUpperCase() !== c));
      setClassifications((prev) => (prev || []).filter((x) => String(x.Code || '').trim().toUpperCase() !== c));
      if (normalizeMainClassCode(selectedMainClass) === normalizeMainClassCode(c)) {
        setSelectedMainClass('');
        setSelectedActualUses([]);
        setActualUses([]);
      }
      showAlert('Main Class deleted.');
    } catch {
      showAlert('Failed to delete main class.');
    }
  };

  const handleAddActualUse = async () => {
    const main = normalizeMainClassCode(selectedMainClass);
    if (!main) {
      showAlert('Please select a Main Class first.');
      return;
    }

    const code = newActualUseCode.trim().toUpperCase();
    const desc = newActualUseDescription.trim();
    if (!code) {
      showAlert('Actual Use Code is required.');
      return;
    }
    if (!desc) {
      showAlert('Actual Use Description is required.');
      return;
    }

    const exists = allActualUses.some(
      (u) => String(u.MainClass || '').trim() === main && String(u.Code || '').trim().toUpperCase() === code
    );
    if (exists) {
      showAlert('Actual Use already exists for this Main Class.');
      return;
    }

    setIsAddingActualUse(true);
    try {
      await upsertCustomActualUse(main, code, desc);
      const created: ActualUse = {
        REGION: '',
        PROV: '',
        CITY: '',
        MainClass: main,
        Code: code,
        Description: desc,
        ForSelection: 1,
      };
      setAllActualUses((prev) => [...prev, created]);
      setActualUses((prev) => [...prev, created].sort((a, b) => a.Description.localeCompare(b.Description)));
      setSelectedActualUses((prev) => (prev.includes(code) ? prev : [...prev, code]));
      setNewActualUseCode('');
      setNewActualUseDescription('');
      showAlert('Actual Use added.');
    } catch {
      showAlert('Failed to add actual use.');
    } finally {
      setIsAddingActualUse(false);
    }
  };

  const handleOpenEditActualUse = (custom: CustomActualUse) => {
    setEditActualUseId(String(custom.id || '').trim());
    setEditActualUseMainClass(String(custom.mainclass_code || '').trim());
    setEditActualUseCode(String(custom.code || '').trim().toUpperCase());
    setEditActualUseDescription(String(custom.description || '').trim());
  };

  const handleSaveEditActualUse = async () => {
    const id = editActualUseId.trim();
    const main = String(editActualUseMainClass || '').trim();
    const code = String(editActualUseCode || '').trim().toUpperCase();
    const desc = String(editActualUseDescription || '').trim();
    if (!id || !main || !code) {
      showAlert('Invalid actual use.');
      return;
    }
    if (!desc) {
      showAlert('Description is required.');
      return;
    }

    setIsEditingActualUse(true);
    try {
      await upsertCustomActualUse(main, code, desc);
      setCustomActualUses((prev) =>
        (prev || []).map((u) => (u.id === id ? { ...u, description: desc } : u))
      );
      setAllActualUses((prev) =>
        (prev || []).map((u) =>
          String(u.MainClass || '').trim() === main && String(u.Code || '').trim().toUpperCase() === code
            ? { ...u, Description: desc }
            : u
        )
      );
      setActualUses((prev) =>
        (prev || [])
          .map((u) =>
            String(u.MainClass || '').trim() === main && String(u.Code || '').trim().toUpperCase() === code
              ? { ...u, Description: desc }
              : u
          )
          .sort((a, b) => a.Description.localeCompare(b.Description))
      );
      setEditActualUseId('');
      setEditActualUseMainClass('');
      setEditActualUseCode('');
      setEditActualUseDescription('');
      showAlert('Actual Use updated.');
    } catch {
      showAlert('Failed to update actual use.');
    } finally {
      setIsEditingActualUse(false);
    }
  };

  const handleDeleteActualUse = async (custom: CustomActualUse) => {
    const id = String(custom.id || '').trim();
    const main = String(custom.mainclass_code || '').trim();
    const code = String(custom.code || '').trim().toUpperCase();
    if (!id) return;

    const ok = await showConfirm(`Delete Actual Use ${code}?`);
    if (!ok) return;

    try {
      await deleteCustomActualUse(id);
      setCustomActualUses((prev) => (prev || []).filter((u) => u.id !== id));
      setAllActualUses((prev) =>
        (prev || []).filter(
          (u) => !(String(u.MainClass || '').trim() === main && String(u.Code || '').trim().toUpperCase() === code)
        )
      );
      setActualUses((prev) =>
        (prev || []).filter(
          (u) => !(String(u.MainClass || '').trim() === main && String(u.Code || '').trim().toUpperCase() === code)
        )
      );
      setSelectedActualUses((prev) => prev.filter((c) => String(c || '').trim().toUpperCase() !== code));
      showAlert('Actual Use deleted.');
    } catch {
      showAlert('Failed to delete actual use.');
    }
  };

  const handleSaveActualUseRate = async (use: ActualUse) => {
    const main = String(use.MainClass || '').trim();
    const code = String(use.Code || '').trim().toUpperCase();
    if (!main || !code) return;

    const key = `${rateContextKey}|${main}|${code}`;
    const rawHa = String(rateDraftHa[key] ?? '');
    const rawSqm = String(rateDraftSqm[key] ?? '');

    const parsedHa = toRateValue(rawHa);
    const parsedSqm = toRateValue(rawSqm);

    if (rawHa.trim() !== '' && parsedHa === null) {
      showAlert('Hectare value must be a valid number.');
      return;
    }
    if (rawSqm.trim() !== '' && parsedSqm === null) {
      showAlert('Sqm value must be a valid number.');
      return;
    }

    let hectareValue: number | null = null;
    if (rawHa.trim() !== '') {
      hectareValue = parsedHa;
    } else if (rawSqm.trim() !== '') {
      hectareValue = parsedSqm === null ? null : parsedSqm * 10000;
    }

    if (hectareValue !== null && hectareValue < 0) {
      showAlert('Value must be 0 or greater.');
      return;
    }

    setSavingRateKey(key);
    try {
      const saved = await upsertActualUseRate(
        selectedMunicipalityCode,
        selectedClassLevel,
        ordinanceNo,
        main,
        code,
        String(use.Description || '').trim() || code,
        hectareValue
      );
      setActualUseRates((prev) => {
        const idx = (prev || []).findIndex(
          (r) =>
            r.id === saved.id ||
            (r.municipality_code === saved.municipality_code &&
              r.class_level === saved.class_level &&
              r.ordinance_no === saved.ordinance_no &&
              r.mainclass_code === saved.mainclass_code &&
              r.actualuse_code === saved.actualuse_code)
        );
        if (idx >= 0) {
          const copy = [...(prev || [])];
          copy[idx] = saved;
          return copy;
        }
        return [...(prev || []), saved];
      });
      const savedHa = saved.rate === null || saved.rate === undefined ? null : Number(saved.rate);
      setRateDraftHa((prev) => ({ ...prev, [key]: savedHa === null || !Number.isFinite(savedHa) ? '' : String(savedHa) }));
      setRateDraftSqm((prev) => ({ ...prev, [key]: savedHa === null || !Number.isFinite(savedHa) ? '' : formatRateNumber(savedHa / 10000) }));
      showAlert('Rate saved.');
    } catch {
      showAlert('Failed to save rate.');
    } finally {
      setSavingRateKey('');
    }
  };

  const handleBulkApplyRates = () => {
    const main = normalizeMainClassCode(selectedMainClass);
    if (!main) {
      showAlert('Please select a Main Class first.');
      return;
    }
    if (!selectedActualUses || selectedActualUses.length === 0) {
      showAlert('Please select at least one actual use.');
      return;
    }

    const rawHa = bulkHa.trim();
    const rawSqm = bulkSqm.trim();
    const parsedHa = toRateValue(rawHa);
    const parsedSqm = toRateValue(rawSqm);

    if (rawHa !== '' && parsedHa === null) {
      showAlert('Hectare value must be a valid number.');
      return;
    }
    if (rawSqm !== '' && parsedSqm === null) {
      showAlert('Sqm value must be a valid number.');
      return;
    }
    if (rawHa === '' && rawSqm === '') {
      showAlert('Enter a value for ha or sqm.');
      return;
    }

    let hectareValue: number | null = null;
    if (rawHa !== '') hectareValue = parsedHa;
    if (rawHa === '' && rawSqm !== '') hectareValue = parsedSqm === null ? null : parsedSqm * 10000;
    if (hectareValue !== null && hectareValue < 0) {
      showAlert('Value must be 0 or greater.');
      return;
    }

    const haText = hectareValue === null ? '' : formatRateNumber(hectareValue);
    const sqmText = hectareValue === null ? '' : formatRateNumber(hectareValue / 10000);

    setRateDraftHa((prev) => {
      const next = { ...prev };
      selectedActualUses.forEach((code) => {
        const c = String(code || '').trim().toUpperCase();
        if (!c) return;
        next[`${rateContextKey}|${main}|${c}`] = haText;
      });
      return next;
    });
    setRateDraftSqm((prev) => {
      const next = { ...prev };
      selectedActualUses.forEach((code) => {
        const c = String(code || '').trim().toUpperCase();
        if (!c) return;
        next[`${rateContextKey}|${main}|${c}`] = sqmText;
      });
      return next;
    });
  };

  const handleBulkSaveRates = async () => {
    const main = normalizeMainClassCode(selectedMainClass);
    if (!main) {
      showAlert('Please select a Main Class first.');
      return;
    }
    if (!selectedActualUses || selectedActualUses.length === 0) {
      showAlert('Please select at least one actual use.');
      return;
    }

    const rawHa = bulkHa.trim();
    const rawSqm = bulkSqm.trim();
    const parsedHa = toRateValue(rawHa);
    const parsedSqm = toRateValue(rawSqm);

    if (rawHa !== '' && parsedHa === null) {
      showAlert('Hectare value must be a valid number.');
      return;
    }
    if (rawSqm !== '' && parsedSqm === null) {
      showAlert('Sqm value must be a valid number.');
      return;
    }
    if (rawHa === '' && rawSqm === '') {
      showAlert('Enter a value for ha or sqm.');
      return;
    }

    let hectareValue: number | null = null;
    if (rawHa !== '') hectareValue = parsedHa;
    if (rawHa === '' && rawSqm !== '') hectareValue = parsedSqm === null ? null : parsedSqm * 10000;
    if (hectareValue !== null && hectareValue < 0) {
      showAlert('Value must be 0 or greater.');
      return;
    }

    setIsSavingBulkRates(true);
    try {
      for (const codeRaw of selectedActualUses) {
        const code = String(codeRaw || '').trim().toUpperCase();
        if (!code) continue;
        const use = (actualUses || []).find(
          (u) => String(u.Code || '').trim().toUpperCase() === code && String(u.MainClass || '').trim() === main
        );
        if (!use) continue;
        const saved = await upsertActualUseRate(
          selectedMunicipalityCode,
          selectedClassLevel,
          ordinanceNo,
          main,
          code,
          String(use.Description || '').trim() || code,
          hectareValue
        );
        setActualUseRates((prev) => {
          const idx = (prev || []).findIndex(
            (r) =>
              r.id === saved.id ||
              (r.municipality_code === saved.municipality_code &&
                r.class_level === saved.class_level &&
                r.ordinance_no === saved.ordinance_no &&
                r.mainclass_code === saved.mainclass_code &&
                r.actualuse_code === saved.actualuse_code)
          );
          if (idx >= 0) {
            const copy = [...(prev || [])];
            copy[idx] = saved;
            return copy;
          }
          return [...(prev || []), saved];
        });
      }

      const haText = hectareValue === null ? '' : formatRateNumber(hectareValue);
      const sqmText = hectareValue === null ? '' : formatRateNumber(hectareValue / 10000);
      setRateDraftHa((prev) => {
        const next = { ...prev };
        selectedActualUses.forEach((c) => {
          const code = String(c || '').trim().toUpperCase();
          if (!code) return;
          next[`${rateContextKey}|${main}|${code}`] = haText;
        });
        return next;
      });
      setRateDraftSqm((prev) => {
        const next = { ...prev };
        selectedActualUses.forEach((c) => {
          const code = String(c || '').trim().toUpperCase();
          if (!code) return;
          next[`${rateContextKey}|${main}|${code}`] = sqmText;
        });
        return next;
      });

      showAlert('Rates saved.');
    } catch {
      showAlert('Failed to save rates.');
    } finally {
      setIsSavingBulkRates(false);
    }
  };

  const handleChangeContext = async () => {
    const ok = await showConfirm('Change municipality and class level?');
    if (!ok) return;

    setIsSetupComplete(false);
    setSetupErrors({});
    setSelectedMainClass('');
    setSelectedActualUses([]);
    setFilterError(null);
    setActualUses([]);
    setAssignments([]);
    setMainClassRateDraft('');
    setOrdinanceNo('');
    setDateApproved('');
    setOrdinances([]);
    setNewOrdinanceNo('');
    setNewDateApproved('');
    ordinancesCacheRef.current.clear();
    setBulkRateEnabled(false);
    setBulkHa('');
    setBulkSqm('');
  };

  // (1) Event listener that triggers upon main class selection
  // (2) Logic to identify and filter member elements associated exclusively with the selected main class
  useEffect(() => {
    if (selectedMainClass) {
      setActualUses([]);
      setSelectedActualUses([]);
      setFilterError(null);
      filterActualUsesForClass(selectedMainClass);
    } else {
      setActualUses([]);
      setSelectedActualUses([]);
      setFilterError(null);
    }
  }, [selectedMainClass, allActualUses]);

  const filterActualUsesForClass = (mainClassCode: string) => {
    // Check if the current filter matches what we are trying to set
    // to prevent infinite loops / excessive renders
    
    // (4) Proper error handling for cases where the main class has no members or selection is invalid
    // If the user selects "Select a main class" (which might be an empty string or 'ALL' depending on the dropdown)
    if (!mainClassCode || mainClassCode === '') {
      setActualUses([]);
      setFilterError(null);
      return;
    }

    // We only care about matching the base code, not the descriptive label in parenthesis
    const normalizedMainClass = normalizeMainClassCode(mainClassCode);
    const result = filterMembersByMainClass(allActualUses, normalizedMainClass);
    
    // (3) UI updates that hide unrelated members while revealing the correct subset
    if (result.error) {
      setFilterError(result.error);
      setActualUses([]);
    } else {
      setFilterError(null);
      // Ensure we sort alphabetically by Description to make finding items easier
      const sortedMembers = [...(result.members as ActualUse[])].sort((a, b) =>
        a.Description.localeCompare(b.Description)
      );
      setActualUses(sortedMembers);
    }
    
    // Auto-check if we already have an assignment for this class
    const existingAssignment = assignments.find(a => a.mainclass_code === normalizedMainClass);
    if (existingAssignment) {
      setSelectedActualUses(existingAssignment.actual_uses.map(u => u.code));
    } else {
      setSelectedActualUses([]); // Clear if no existing assignment
    }
  };

  // Re-run the filter logic whenever the assignments data is loaded/updated
  // This ensures the "auto-check" logic catches up if the user changes selections rapidly
  useEffect(() => {
    if (selectedMainClass && allActualUses.length > 0) {
      // Find existing assignment to auto-check items
      const normalizedMainClass = normalizeMainClassCode(selectedMainClass);
      const existingAssignment = assignments.find(a => a.mainclass_code === normalizedMainClass);
      if (existingAssignment) {
        setSelectedActualUses(existingAssignment.actual_uses.map(u => u.code));
      }
    }
  }, [assignments]);

  const handleToggle = (code: string) => {
    setSelectedActualUses(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    const normalizedMainClass = normalizeMainClassCode(selectedMainClass);
    const visibleActualUses =
      normalizedMainClass === ''
        ? actualUses
        : actualUses.filter(u => (u.MainClass || '').trim() === normalizedMainClass);

    if (selectedActualUses.length === visibleActualUses.length) {
      setSelectedActualUses([]);
    } else {
      setSelectedActualUses(visibleActualUses.map(u => u.Code));
    }
  };

  const handleSave = async () => {
    if (!selectedMainClass) {
      showAlert('Please select a Main Class first.');
      return;
    }

    if (!selectedMunicipalityCode || !selectedClassLevel || !ordinanceNo.trim() || !dateApproved.trim()) {
      showAlert('Please complete Municipality, Class Level, Ordinance No., and Date Approved first.');
      return;
    }
    
    if (selectedActualUses.length === 0) {
      showAlert('Please select at least one actual use to assign.');
      return;
    }

    const classification = classifications.find(c => c.Code === selectedMainClass);
    if (!classification) return;

    setIsSaving(true);
    try {
      const assignedObjects = selectedActualUses.map(code => {
        const use = actualUses.find(u => u.Code === code);
        return {
          code: code,
          name: use ? use.Description : code
        };
      });

      await upsertMainclassActualUseAssignment(
        selectedMunicipalityCode,
        selectedClassLevel,
        ordinanceNo.trim(),
        dateApproved.trim(),
        classification.Code,
        classification.Description,
        assignedObjects
      );
      showAlert('Actual Use configuration saved successfully.');
      
      // Refresh assignments table
      const updatedAssignments = await getMainclassActualUseAssignments({
        municipalityCode: selectedMunicipalityCode,
        classLevel: selectedClassLevel,
      });
      setAssignments(updatedAssignments);
    } catch (error) {
      console.error('Error saving assignment:', error);
      showAlert('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (code: string) => {
    setSelectedMainClass(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, className: string) => {
    const confirmed = await showConfirm(`Are you sure you want to remove the configuration for ${className}?`);
    if (!confirmed) return;

    try {
      await deleteMainclassActualUseAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      
      const assignmentToDelete = assignments.find(a => a.id === id);
      if (assignmentToDelete && assignmentToDelete.mainclass_code === selectedMainClass) {
        setSelectedActualUses([]);
      }
      
      showAlert('Configuration deleted successfully.');
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showAlert('Failed to delete configuration.');
    }
  };

  return (
    <div className="w-full p-6 space-y-6">
      {!isSetupComplete ? (
        <Card className="border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
          <CardHeader className="bg-background dark:bg-background border-b border-border dark:border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Main Class Setup
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Complete these required selections before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Municipality</Label>
                <Input
                  value={municipalitySearch}
                  onChange={(e) => setMunicipalitySearch(e.target.value)}
                  placeholder="Search municipality..."
                  className="h-8 text-xs"
                />
                <Select
                  value={selectedMunicipalityCode}
                  onValueChange={(v) => {
                    setSelectedMunicipalityCode(v);
                    setSetupErrors((p) => ({ ...p, municipality: undefined }));
                  }}
                >
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder={isLoadingMunicipalities ? 'Loading municipalities...' : 'Select municipality'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[16rem] bg-background">
                    {(municipalities || [])
                      .filter((m) => {
                        const q = municipalitySearch.trim().toLowerCase();
                        if (!q) return true;
                        const code = String(m.CODE || '').toLowerCase();
                        const name = String(m.DESCRIPTION || '').toLowerCase();
                        return code.includes(q) || name.includes(q);
                      })
                      .map((m) => (
                        <SelectItem
                          key={m.CODE}
                          value={String(m.CODE).trim()}
                          className="data-[state=checked]:bg-primary data-[state=checked]:text-white"
                        >
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">{m.CODE}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{m.DESCRIPTION}</span>
                          </span>
                        </SelectItem>
                      ))}
                    {!isLoadingMunicipalities && municipalities.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No municipalities available.</div>
                    ) : null}
                  </SelectContent>
                </Select>
                {setupErrors.municipality ? (
                  <p className="text-xs text-red-600 dark:text-red-500">{setupErrors.municipality}</p>
                ) : null}
              </div>

              <div className="lg:col-span-5 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Class Level</Label>
                <Select
                  value={selectedClassLevel}
                  onValueChange={(v) => {
                    setSelectedClassLevel(v);
                    setSetupErrors((p) => ({ ...p, classLevel: undefined }));
                    setOrdinanceNo('');
                    setDateApproved('');
                  }}
                >
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Select class level" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[16rem] bg-background">
                    <SelectItem value="1" className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                      1st Grade
                    </SelectItem>
                    <SelectItem value="2" className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                      2nd Grade
                    </SelectItem>
                    <SelectItem value="3" className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                      3rd Grade
                    </SelectItem>
                    <SelectItem value="4" className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                      4th Grade
                    </SelectItem>
                  </SelectContent>
                </Select>
                {setupErrors.classLevel ? (
                  <p className="text-xs text-red-600 dark:text-red-500">{setupErrors.classLevel}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Ordinance No.</Label>
                <Select
                  value={ordinanceNo}
                  onValueChange={(v) => {
                    const selected = (ordinances || []).find((o) => String(o.ordinance_no) === String(v));
                    setOrdinanceNo(v);
                    setDateApproved(selected ? String(selected.date_approved || '').slice(0, 10) : '');
                    setSetupErrors((p) => ({ ...p, ordinanceNo: undefined, dateApproved: undefined }));
                  }}
                  disabled={isLoadingOrdinances}
                >
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder={isLoadingOrdinances ? 'Loading ordinances...' : 'Select ordinance'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[16rem] bg-background">
                    {(ordinances || []).map((o) => (
                      <SelectItem
                        key={o.id}
                        value={String(o.ordinance_no)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-white"
                      >
                        <span className="flex items-center gap-1">
                          <span>{o.ordinance_no}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{String(o.date_approved || '').slice(0, 10)}</span>
                        </span>
                      </SelectItem>
                    ))}
                    {!isLoadingOrdinances && ordinances.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No ordinances yet. Add one below.</div>
                    ) : null}
                  </SelectContent>
                </Select>
                {setupErrors.ordinanceNo ? (
                  <p className="text-xs text-red-600 dark:text-red-500">{setupErrors.ordinanceNo}</p>
                ) : null}
              </div>
              <div className="lg:col-span-5 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Date Approved</Label>
                <Input
                  type="date"
                  value={dateApproved}
                  onChange={(e) => {
                    setDateApproved(e.target.value);
                    setSetupErrors((p) => ({ ...p, dateApproved: undefined }));
                  }}
                  className="h-8 text-xs"
                  disabled={Boolean(ordinanceNo)}
                />
                {setupErrors.dateApproved ? (
                  <p className="text-xs text-red-600 dark:text-red-500">{setupErrors.dateApproved}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Add Ordinance No.</Label>
                <Input
                  value={newOrdinanceNo}
                  onChange={(e) => {
                    setNewOrdinanceNo(e.target.value);
                    setSetupErrors((p) => ({ ...p, ordinanceNo: undefined }));
                  }}
                  placeholder="e.g. Ordinance 2026-01"
                  className="h-8 text-xs"
                  disabled={isAddingOrdinance}
                />
              </div>
              <div className="lg:col-span-5 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Add Date Approved</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={newDateApproved}
                    onChange={(e) => {
                      setNewDateApproved(e.target.value);
                      setSetupErrors((p) => ({ ...p, dateApproved: undefined }));
                    }}
                    className="h-8 text-xs"
                    disabled={isAddingOrdinance}
                  />
                  <Button
                    type="button"
                    className="h-8 bg-primary text-white hover:bg-primary/90 text-xs"
                    onClick={handleAddOrdinance}
                    disabled={isAddingOrdinance}
                  >
                    {isAddingOrdinance ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {selectedMunicipalityCode ? (
                  <Badge variant="outline" className="bg-background border-border text-xs">
                    Municipality: {selectedMunicipalityCode}
                  </Badge>
                ) : null}
                {selectedClassLevel ? (
                  <Badge variant="outline" className="bg-background border-border text-xs">
                    Class Level: {selectedClassLevel}
                  </Badge>
                ) : null}
                {ordinanceNo.trim() ? (
                  <Badge variant="outline" className="bg-background border-border text-xs">
                    Ordinance No.: {ordinanceNo.trim()}
                  </Badge>
                ) : null}
                {dateApproved.trim() ? (
                  <Badge variant="outline" className="bg-background border-border text-xs">
                    Date Approved: {dateApproved.trim()}
                  </Badge>
                ) : null}
              </div>
              <Button
                className="bg-primary text-white hover:bg-primary/90"
                onClick={handleSaveSetup}
                disabled={isSavingSetup}
              >
                {isSavingSetup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isSavingSetup ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Main Class Setup
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure which Main Classes (e.g., Residential, Commercial) are available.
          </p>
          {isSetupComplete ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMunicipalityCode ? (
                <Badge variant="outline" className="bg-background border-border text-xs">
                  Municipality: {selectedMunicipalityCode}
                </Badge>
              ) : null}
              {selectedClassLevel ? (
                <Badge variant="outline" className="bg-background border-border text-xs">
                  Class Level: {selectedClassLevel}
                </Badge>
              ) : null}
              {ordinanceNo.trim() ? (
                <Badge variant="outline" className="bg-background border-border text-xs">
                  Ordinance No.: {ordinanceNo.trim()}
                </Badge>
              ) : null}
              {dateApproved.trim() ? (
                <Badge variant="outline" className="bg-background border-border text-xs">
                  Date Approved: {dateApproved.trim()}
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={handleChangeContext}>
                Change
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {!isSetupComplete ? (
        <Card className="border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              Complete User Setup to continue.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isSetupComplete ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Panel */}
          <Card className="lg:col-span-5 border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
            <CardHeader className="bg-background dark:bg-background border-b border-border dark:border-border pb-4">
              <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Mapping Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  1. Select Main Class
                </Label>
                <Select 
                  value={selectedMainClass} 
                  onValueChange={setSelectedMainClass}
                  disabled={isLoadingClasses}
                >
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select a main class"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[16rem] bg-background">
                    {classifications.map((cls) => (
                      <SelectItem key={cls.Code} value={cls.Code} className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">{cls.Code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{cls.Description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-3">
                  <Input
                    value={newMainClassCode}
                    onChange={(e) => setNewMainClassCode(e.target.value)}
                    placeholder="New code"
                    className="h-8 text-xs"
                    disabled={isAddingMainClass}
                  />
                </div>
                <div className="lg:col-span-7">
                  <Input
                    value={newMainClassName}
                    onChange={(e) => setNewMainClassName(e.target.value)}
                    placeholder="New main class name"
                    className="h-8 text-xs"
                    disabled={isAddingMainClass}
                  />
                </div>
                <div className="lg:col-span-2 flex">
                  <Button
                    type="button"
                    className="h-8 w-full bg-primary text-white hover:bg-primary/90 text-xs"
                    onClick={handleAddMainClass}
                    disabled={isAddingMainClass}
                  >
                    {isAddingMainClass ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add
                  </Button>
                </div>
              </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  2. Select Actual Uses
                </Label>
                {actualUses.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-primary"
                    onClick={handleSelectAll}
                  >
                    {selectedActualUses.length === actualUses.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-rate"
                    checked={bulkRateEnabled}
                    onCheckedChange={(v) => setBulkRateEnabled(Boolean(v))}
                    className="data-[state=checked]:text-white"
                  />
                  <Label htmlFor="bulk-rate" className="text-xs text-muted-foreground cursor-pointer">
                    Bulk rate for checked items
                  </Label>
                </div>

                {bulkRateEnabled ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={bulkHa}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBulkHa(v);
                          const parsed = toRateValue(v);
                          if (v.trim() === '') {
                            setBulkSqm('');
                          } else if (parsed !== null) {
                            setBulkSqm(formatRateNumber(parsed / 10000));
                          }
                        }}
                        placeholder=""
                        className="h-7 w-24 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground w-7">ha</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={bulkSqm}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBulkSqm(v);
                          const parsed = toRateValue(v);
                          if (v.trim() === '') {
                            setBulkHa('');
                          } else if (parsed !== null) {
                            setBulkHa(formatRateNumber(parsed * 10000));
                          }
                        }}
                        placeholder=""
                        className="h-7 w-24 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground w-8">sqm</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkApplyRates}>
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-primary text-white hover:bg-primary/90"
                      onClick={handleBulkSaveRates}
                      disabled={isSavingBulkRates}
                    >
                      {isSavingBulkRates ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save All
                    </Button>
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-3">
                  <Input
                    value={newActualUseCode}
                    onChange={(e) => setNewActualUseCode(e.target.value)}
                    placeholder="New code"
                    className="h-8 text-xs"
                    disabled={!selectedMainClass || isAddingActualUse}
                  />
                </div>
                <div className="lg:col-span-7">
                  <Input
                    value={newActualUseDescription}
                    onChange={(e) => setNewActualUseDescription(e.target.value)}
                    placeholder="New actual use description"
                    className="h-8 text-xs"
                    disabled={!selectedMainClass || isAddingActualUse}
                  />
                </div>
                <div className="lg:col-span-2 flex">
                  <Button
                    type="button"
                    className="h-8 w-full bg-primary text-white hover:bg-primary/90 text-xs"
                    onClick={handleAddActualUse}
                    disabled={!selectedMainClass || isAddingActualUse}
                  >
                    {isAddingActualUse ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add
                  </Button>
                </div>
              </div>

              <div className="bg-background border border-border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                {!selectedMainClass ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <Tag className="h-8 w-8 mb-2" />
                    <p className="text-sm">Select a main class to view actual uses</p>
                  </div>
                ) : isLoadingActualUses ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                    <p className="text-sm">Loading actual uses...</p>
                  </div>
                ) : filterError ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <p className="text-sm text-amber-600 dark:text-amber-500">{filterError}</p>
                  </div>
                ) : actualUses.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <p className="text-sm">No actual uses found for this class.</p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3">
                    {(() => {
                      const normalizedMainClass = normalizeMainClassCode(selectedMainClass);
                      const visibleActualUses =
                        normalizedMainClass === ''
                          ? actualUses
                          : actualUses.filter(u => (u.MainClass || '').trim() === normalizedMainClass);
                      return visibleActualUses;
                    })().map((use) => (
                      <div
                        key={`${(use.MainClass || '').trim()}-${use.Code}`}
                        className="flex items-start space-x-2 p-2 hover:bg-muted/10 rounded-md transition-colors"
                      >
                        <Checkbox 
                          id={`use-${use.Code}`} 
                          checked={selectedActualUses.includes(use.Code)}
                          onCheckedChange={() => handleToggle(use.Code)}
                          className="mt-0.5 data-[state=checked]:text-white"
                        />
                        <div className="flex items-start justify-between gap-2 flex-1">
                          <Label 
                            htmlFor={`use-${use.Code}`}
                            className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            <span className="text-foreground">{use.Description}</span>
                            <span className="text-muted-foreground text-xs ml-2">({use.Code})</span>
                            <span className="text-muted-foreground text-[10px] ml-2 bg-muted/50 px-1.5 py-0.5 rounded border border-border">Class: {use.MainClass}</span>
                          </Label>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const rateKey = `${rateContextKey}|${String(use.MainClass || '').trim()}|${String(use.Code || '').trim().toUpperCase()}`;
                              return (
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={rateDraftHa[rateKey] ?? ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setRateDraftHa((p) => ({ ...p, [rateKey]: v }));
                                        const parsed = toRateValue(v);
                                        if (v.trim() === '') {
                                          setRateDraftSqm((p) => ({ ...p, [rateKey]: '' }));
                                        } else if (parsed !== null) {
                                          setRateDraftSqm((p) => ({ ...p, [rateKey]: formatRateNumber(parsed / 10000) }));
                                        }
                                      }}
                                      placeholder={isLoadingActualUseRates ? '...' : ''}
                                      className="h-7 w-24 text-xs"
                                    />
                                    <span className="text-[10px] text-muted-foreground w-7">ha</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={rateDraftSqm[rateKey] ?? ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setRateDraftSqm((p) => ({ ...p, [rateKey]: v }));
                                        const parsed = toRateValue(v);
                                        if (v.trim() === '') {
                                          setRateDraftHa((p) => ({ ...p, [rateKey]: '' }));
                                        } else if (parsed !== null) {
                                          setRateDraftHa((p) => ({ ...p, [rateKey]: formatRateNumber(parsed * 10000) }));
                                        }
                                      }}
                                      placeholder={isLoadingActualUseRates ? '...' : ''}
                                      className="h-7 w-24 text-xs"
                                    />
                                    <span className="text-[10px] text-muted-foreground w-8">sqm</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleSaveActualUseRate(use)}
                                    disabled={savingRateKey === rateKey}
                                    title="Save Rate"
                                  >
                                    {savingRateKey === rateKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                  </Button>
                                </div>
                              );
                            })()}

                            {(() => {
                              const key = `${String(use.MainClass || '').trim()}|${String(use.Code || '').trim().toUpperCase()}`;
                              const custom = customActualUseByKey.get(key);
                              if (!custom) return null;
                              return (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleOpenEditActualUse(custom)}
                                    title="Edit Actual Use"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => handleDeleteActualUse(custom)}
                                    title="Delete Actual Use"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button 
              className="w-full bg-primary text-white hover:bg-primary/90" 
              onClick={handleSave}
              disabled={isSaving || !selectedMainClass || selectedActualUses.length === 0}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* Right Table Panel */}
        <Card className="lg:col-span-7 border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface flex flex-col">
          <CardHeader className="bg-background dark:bg-background border-b border-border dark:border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Main Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-background border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-1/3">Main Class</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Actual Uses Enabled</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingAssignments ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading configurations...
                      </td>
                    </tr>
                  ) : mainClassRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                        <p>No main classes available.</p>
                      </td>
                    </tr>
                  ) : (
                    mainClassRows.map((row) => (
                      <tr 
                        key={row.code} 
                        className={`hover:bg-muted/10 transition-colors ${selectedMainClass === row.code ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3 border-r border-border">
                          <p className="font-medium text-foreground flex items-center gap-1">
                            <span className="text-muted-foreground">{row.code}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{row.name}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <div className="flex flex-wrap gap-1">
                            {row.assignment && row.assignment.actual_uses.length > 0 ? (
                              (() => {
                                const preview = row.assignment!.actual_uses.slice(0, 8);
                                const remaining = Math.max(row.assignment!.actual_uses.length - preview.length, 0);
                                return (
                                  <>
                                    {preview.map((u) => (
                                      <Badge key={u.code} variant="outline" className="font-normal text-[10px] bg-background border-border gap-1 px-1.5">
                                        <span className="text-muted-foreground">{u.code}</span>
                                        <span className="text-border">-</span>
                                        <span>{u.name}</span>
                                        {(() => {
                                          const rateKey = `${rateContextKey}|${String(row.code || '').trim()}|${String(u.code || '').trim().toUpperCase()}`;
                                          const rate = actualUseRateMap.get(rateKey);
                                          if (rate === undefined || rate === null) return null;
                                          const sqm = rate / 10000;
                                          return (
                                            <>
                                              <span className="text-border">•</span>
                                              <span className="text-muted-foreground">sqm:</span>
                                              <span className="text-foreground">{formatRateNumber(sqm)}</span>
                                            </>
                                          );
                                        })()}
                                      </Badge>
                                    ))}
                                    {remaining > 0 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-primary"
                                        onClick={() => {
                                          setViewAllAssignment(row.assignment);
                                          setViewAllSearch('');
                                        }}
                                      >
                                        View all ({row.assignment!.actual_uses.length})
                                      </Button>
                                    ) : null}
                                  </>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Not configured</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                              onClick={() => handleEdit(row.code)}
                              title="Edit Configuration"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {customMainClassCodes.has(String(row.code || '').trim().toUpperCase()) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleOpenEditMainClass(row.code, row.name)}
                                title="Edit Main Class"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {row.assignment ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleDelete(row.assignment!.id, row.assignment!.mainclass_name)}
                                title="Remove Configuration"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : customMainClassCodes.has(String(row.code || '').trim().toUpperCase()) ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleDeleteMainClass(row.code)}
                                title="Delete Main Class"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      ) : null}

      <Dialog
        open={Boolean(viewAllAssignment)}
        onOpenChange={(open) => {
          if (!open) {
            setViewAllAssignment(null);
            setViewAllSearch('');
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Actual Uses</DialogTitle>
            <DialogDescription>
              {viewAllAssignment
                ? `${viewAllAssignment.mainclass_code} - ${viewAllAssignment.mainclass_name} • Municipality ${viewAllAssignment.municipality_code} • Class Level ${viewAllAssignment.class_level}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={viewAllSearch}
              onChange={(e) => setViewAllSearch(e.target.value)}
              placeholder="Search code/name..."
              className="h-8 text-xs"
            />

            <div className="max-h-[60vh] overflow-y-auto border border-border rounded-md bg-background p-3">
              {viewAllAssignment ? (
                (() => {
                  const q = viewAllSearch.trim().toLowerCase();
                  const items = (viewAllAssignment.actual_uses || []).filter((u) => {
                    if (!q) return true;
                    return String(u.code || '').toLowerCase().includes(q) || String(u.name || '').toLowerCase().includes(q);
                  });

                  if (items.length === 0) {
                    return <div className="text-xs text-muted-foreground">No actual uses match your search.</div>;
                  }

                  return (
                    <div className="flex flex-wrap gap-1">
                      {items.map((u) => (
                        <Badge key={`${u.code}-${u.name}`} variant="outline" className="font-normal text-[10px] bg-background border-border gap-1 px-1.5">
                          <span className="text-muted-foreground">{u.code}</span>
                          <span className="text-border">-</span>
                          <span>{u.name}</span>
                          {(() => {
                            const main = String(viewAllAssignment?.mainclass_code || '').trim();
                            const rateKey = `${rateContextKey}|${main}|${String(u.code || '').trim().toUpperCase()}`;
                            const rate = actualUseRateMap.get(rateKey);
                            if (rate === undefined || rate === null) return null;
                            const sqm = rate / 10000;
                            return (
                              <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground">sqm:</span>
                                <span className="text-foreground">{formatRateNumber(sqm)}</span>
                              </>
                            );
                          })()}
                        </Badge>
                      ))}
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editMainClassCode)}
        onOpenChange={(open) => {
          if (!open) {
            setEditMainClassCode('');
            setEditMainClassName('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Main Class</DialogTitle>
            <DialogDescription>Update the name of this main class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Code</Label>
              <Input value={editMainClassCode} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Name</Label>
              <Input
                value={editMainClassName}
                onChange={(e) => setEditMainClassName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="bg-primary text-white hover:bg-primary/90"
                onClick={handleSaveEditMainClass}
                disabled={isEditingMainClass}
              >
                {isEditingMainClass ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editActualUseId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditActualUseId('');
            setEditActualUseMainClass('');
            setEditActualUseCode('');
            setEditActualUseDescription('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Actual Use</DialogTitle>
            <DialogDescription>Update the description of this actual use.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Code</Label>
              <Input value={editActualUseCode} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Description</Label>
              <Input
                value={editActualUseDescription}
                onChange={(e) => setEditActualUseDescription(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="bg-primary text-white hover:bg-primary/90"
                onClick={handleSaveEditActualUse}
                disabled={isEditingActualUse}
              >
                {isEditingActualUse ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActualUseSetupPage;
