import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/rptas/ui/card';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Label } from '@/modules/rptas/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/rptas/ui/select';
import { Loader2, Percent, Save, Trash2, Plus, Tag } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getClassifications, getActualUses, Classification, ActualUse } from '../../../shared/services/classificationService';
import {
  getActualUseRates,
  upsertActualUseRate,
  deleteActualUseRate,
  ActualUseRate,
} from '../../../shared/services/actualUseRateService';
import { normalizeMainClassCode } from '../utils/normalizeMainClassCode';

type Row = {
  id?: string;
  mainClass: string;
  code: string;
  name: string;
  rate: number | null;
  source: 'mssql' | 'custom';
};

const toRateNumber = (value: string): number | null => {
  const v = value.trim();
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return n;
};

const ActualUseRatePage: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const DEFAULT_MUNICIPALITY = 'ALL';
  const DEFAULT_CLASS_LEVEL = 'ALL';
  const DEFAULT_ORDINANCE = 'ALL';

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [actualUses, setActualUses] = useState<ActualUse[]>([]);
  const [rates, setRates] = useState<ActualUseRate[]>([]);

  const [selectedMainClass, setSelectedMainClass] = useState<string>('');
  const selectedMainClassCode = useMemo(() => normalizeMainClassCode(selectedMainClass), [selectedMainClass]);
  const [search, setSearch] = useState('');

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  const [newMainClass, setNewMainClass] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [cls, uses, r] = await Promise.all([
        getClassifications(),
        getActualUses({ pageSize: 2000 }),
        getActualUseRates({ municipalityCode: DEFAULT_MUNICIPALITY, classLevel: DEFAULT_CLASS_LEVEL, ordinanceNo: DEFAULT_ORDINANCE }),
      ]);
      setClassifications(cls || []);
      setActualUses(uses || []);
      setRates(r || []);
    } catch (e) {
      showAlert('Failed to load actual use rates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const rows: Row[] = useMemo(() => {
    const byKey = new Map<string, ActualUseRate>();
    (rates || []).forEach((r) => {
      const mainClass = normalizeMainClassCode(String(r.mainclass_code));
      const code = String(r.actualuse_code).trim();
      byKey.set(`${mainClass}|${code}`, r);
    });

    const baseByKey = new Map<string, Row>();
    (actualUses || []).forEach((u) => {
      const mainClass = normalizeMainClassCode(u.MainClass);
      const code = String(u.Code || '').trim();
      if (!mainClass || !code) return;

      const name = String(u.Description || '').trim();
      const saved = byKey.get(`${mainClass}|${code}`);
      const row: Row = {
        id: saved?.id,
        mainClass,
        code,
        name,
        rate: saved?.rate ?? null,
        source: 'mssql',
      };

      const k = `${mainClass}|${code}`;
      const existing = baseByKey.get(k);
      if (!existing) {
        baseByKey.set(k, row);
        return;
      }

      if (!existing.name && row.name) {
        baseByKey.set(k, row);
      }
    });

    const base = [...baseByKey.values()].sort((a, b) =>
      a.mainClass === b.mainClass ? a.code.localeCompare(b.code) : a.mainClass.localeCompare(b.mainClass)
    );

    const actualKeySet = new Set(base.map((r) => `${r.mainClass}|${r.code}`));

    const customByKey = new Map<string, Row>();
    (rates || []).forEach((r) => {
      const mainClass = normalizeMainClassCode(String(r.mainclass_code));
      const code = String(r.actualuse_code).trim();
      if (!mainClass || !code) return;

      const k = `${mainClass}|${code}`;
      if (actualKeySet.has(k)) return;

      const row: Row = {
        id: r.id,
        mainClass,
        code,
        name: String(r.actualuse_name).trim(),
        rate: r.rate ?? null,
        source: 'custom',
      };

      const existing = customByKey.get(k);
      if (!existing) {
        customByKey.set(k, row);
        return;
      }

      if (!existing.name && row.name) {
        customByKey.set(k, row);
      }
    });

    const custom = [...customByKey.values()].sort((a, b) =>
      a.mainClass === b.mainClass ? a.code.localeCompare(b.code) : a.mainClass.localeCompare(b.mainClass)
    );

    return [...base, ...custom];
  }, [actualUses, rates]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedMainClassCode && r.mainClass !== selectedMainClassCode) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.mainClass.toLowerCase().includes(q)
      );
    });
  }, [rows, selectedMainClassCode, search]);

  const rowKeySignature = useMemo(() => visibleRows.map((r) => `${r.mainClass}|${r.code}`).join('|'), [visibleRows]);

  useEffect(() => {
    const next: Record<string, string> = {};
    visibleRows.forEach((r) => {
      const k = `${r.mainClass}|${r.code}`;
      next[k] = r.rate === null || r.rate === undefined ? '' : String(r.rate);
    });
    setDraftRates((prev) => ({ ...prev, ...next }));
  }, [rowKeySignature]);

  const handleSaveRow = async (row: Row) => {
    const k = `${row.mainClass}|${row.code}`;
    setIsSaving(k);
    try {
      const rateValue = toRateNumber(draftRates[k] ?? '');
      if ((draftRates[k] ?? '').trim() !== '' && rateValue === null) {
        showAlert('Rate must be a valid number.');
        return;
      }
      if (rateValue !== null && rateValue < 0) {
        showAlert('Rate must be 0 or greater.');
        return;
      }

      const saved = await upsertActualUseRate(
        DEFAULT_MUNICIPALITY,
        DEFAULT_CLASS_LEVEL,
        DEFAULT_ORDINANCE,
        row.mainClass,
        row.code,
        row.name,
        rateValue
      );
      setRates((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev.filter((p) => !(p.mainclass_code === saved.mainclass_code && p.actualuse_code === saved.actualuse_code)), saved];
      });
      setDraftRates((prev) => ({ ...prev, [k]: rateValue === null ? '' : String(rateValue) }));
      showAlert('Rate saved.');
    } catch (e) {
      showAlert('Failed to save rate.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleDeleteRow = async (row: Row) => {
    if (!row.id) return;
    const ok = await showConfirm(`Remove rate for ${row.mainClass} - ${row.code}?`);
    if (!ok) return;

    try {
      await deleteActualUseRate(row.id);
      setRates((prev) => prev.filter((p) => p.id !== row.id));
      showAlert('Rate removed.');
    } catch (e) {
      showAlert('Failed to remove rate.');
    }
  };

  const handleAdd = async () => {
    const mainClass = normalizeMainClassCode(newMainClass);
    const code = newCode.trim();
    const name = newName.trim();
    const rateValue = toRateNumber(newRate);

    if (!mainClass) {
      showAlert('Main Class is required.');
      return;
    }
    if (!code) {
      showAlert('Actual Use code is required.');
      return;
    }
    if (!name) {
      showAlert('Actual Use name is required.');
      return;
    }
    if (newRate.trim() !== '' && rateValue === null) {
      showAlert('Rate must be a valid number.');
      return;
    }
    if (rateValue !== null && rateValue < 0) {
      showAlert('Rate must be 0 or greater.');
      return;
    }

    setIsAdding(true);
    try {
      const saved = await upsertActualUseRate(
        DEFAULT_MUNICIPALITY,
        DEFAULT_CLASS_LEVEL,
        DEFAULT_ORDINANCE,
        mainClass,
        code,
        name,
        rateValue
      );
      setRates((prev) => [...prev.filter((p) => p.id !== saved.id), saved]);
      setNewMainClass('');
      setNewCode('');
      setNewName('');
      setNewRate('');
      showAlert('Actual Use added.');
    } catch (e) {
      showAlert('Failed to add actual use.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Actual Use Rates
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Set rates per Actual Use. Rates are stored in Supabase; reference data is read-only.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
          <CardHeader className="bg-background border-b border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Add Actual Use
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Main Class</Label>
              <Select value={newMainClass} onValueChange={setNewMainClass}>
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder="Select main class" />
                </SelectTrigger>
                <SelectContent className="max-h-[16rem] bg-background">
                  {classifications.map((cls) => (
                    <SelectItem
                      key={cls.Code}
                      value={normalizeMainClassCode(cls.Code)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:text-white"
                    >
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
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Actual Use Code</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. MB" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Actual Use Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. MULTIPURPOSE" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Rate</Label>
              <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="e.g. 0.015" />
            </div>
            <Button className="w-full bg-primary text-white hover:bg-primary/90" onClick={handleAdd} disabled={isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-border shadow-sm overflow-hidden bg-surface dark:bg-surface flex flex-col">
          <CardHeader className="bg-background border-b border-border pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Rates Table
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-[240px]">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code/name..." className="h-8 text-xs" />
                </div>
                <Select value={selectedMainClass} onValueChange={setSelectedMainClass}>
                  <SelectTrigger className="h-8 w-[220px] bg-background border-border text-xs">
                    <SelectValue placeholder="All main classes" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[16rem] bg-background">
                    {classifications.map((cls) => (
                      <SelectItem
                        key={cls.Code}
                        value={normalizeMainClassCode(cls.Code)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-white"
                      >
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">{cls.Code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{cls.Description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={refresh} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-background border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground border-r border-border w-12 text-center">
                      <Tag className="h-4 w-4 inline-block" />
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground border-r border-border">
                      Actual Use
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground border-r border-border w-32">
                      Rate
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground border-r border-border w-24">
                      Source
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-28 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No actual uses found.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const k = `${row.mainClass}|${row.code}`;
                      return (
                        <tr key={`${row.source}-${k}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 border-r border-border text-center">
                            <span className="text-muted-foreground">{row.mainClass}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-border">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{row.code}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="font-medium text-foreground">{row.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-border">
                            <Input
                              value={draftRates[k] ?? ''}
                              onChange={(e) => setDraftRates((prev) => ({ ...prev, [k]: e.target.value }))}
                              className="h-8 text-xs"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 border-r border-border">
                            <span className="text-muted-foreground">{row.source === 'mssql' ? 'MSSQL' : 'Custom'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleSaveRow(row)}
                                disabled={isSaving === k}
                                title="Save Rate"
                              >
                                {isSaving === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleDeleteRow(row)}
                                disabled={!row.id}
                                title={row.id ? 'Remove Rate' : 'No saved rate yet'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActualUseRatePage;
