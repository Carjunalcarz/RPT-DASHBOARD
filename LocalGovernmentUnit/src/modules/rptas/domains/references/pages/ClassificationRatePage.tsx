import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/rptas/ui/card';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Label } from '@/modules/rptas/ui/label';
import { Loader2, Percent, Save, Trash2, Plus } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getClassifications, Classification } from '../../../shared/services/classificationService';
import {
  getClassificationRates,
  upsertClassificationRate,
  deleteClassificationRate,
  ClassificationRate,
} from '../../../shared/services/classificationRateService';

type Row = {
  id?: string;
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

const ClassificationRatePage: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [rates, setRates] = useState<ClassificationRate[]>([]);

  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [cls, r] = await Promise.all([getClassifications(), getClassificationRates()]);
      setClassifications(cls || []);
      setRates(r || []);
    } catch (e) {
      showAlert('Failed to load classification rates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const rows: Row[] = useMemo(() => {
    const clsByCode = new Map((classifications || []).map((c) => [String(c.Code).trim(), c]));
    const rateByCode = new Map((rates || []).map((r) => [String(r.code).trim(), r]));

    const mssqlRows: Row[] = (classifications || [])
      .map((c) => {
        const code = String(c.Code).trim();
        const rateRow = rateByCode.get(code);
        return {
          id: rateRow?.id,
          code,
          name: String(c.Description || '').trim(),
          rate: rateRow?.rate ?? null,
          source: 'mssql' as const,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    const customRows: Row[] = (rates || [])
      .filter((r) => !clsByCode.has(String(r.code).trim()))
      .map((r) => ({
        id: r.id,
        code: String(r.code).trim(),
        name: String(r.name).trim(),
        rate: r.rate ?? null,
        source: 'custom' as const,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    return [...mssqlRows, ...customRows];
  }, [classifications, rates]);

  const rowCodeSignature = useMemo(() => rows.map((r) => r.code).join('|'), [rows]);

  useEffect(() => {
    const next: Record<string, string> = {};
    rows.forEach((r) => {
      next[r.code] = r.rate === null || r.rate === undefined ? '' : String(r.rate);
    });
    setDraftRates(next);
  }, [rowCodeSignature]);

  const handleSaveRow = async (row: Row) => {
    setIsSaving(row.code);
    try {
      const rateValue = toRateNumber(draftRates[row.code] ?? '');
      if ((draftRates[row.code] ?? '').trim() !== '' && rateValue === null) {
        showAlert('Rate must be a valid number.');
        return;
      }
      if (rateValue !== null && rateValue < 0) {
        showAlert('Rate must be 0 or greater.');
        return;
      }

      const saved = await upsertClassificationRate(row.code, row.name, rateValue);
      setDraftRates((prev) => ({
        ...prev,
        [row.code]: rateValue === null ? '' : String(rateValue),
      }));
      setRates((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev.filter((p) => p.code !== saved.code), saved];
      });
      showAlert('Rate saved.');
    } catch (e) {
      showAlert('Failed to save rate.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleDeleteRow = async (row: Row) => {
    if (!row.id) return;
    const ok = await showConfirm(`Remove rate for ${row.code} - ${row.name}?`);
    if (!ok) return;

    try {
      await deleteClassificationRate(row.id);
      setRates((prev) => prev.filter((p) => p.id !== row.id));
      showAlert('Rate removed.');
    } catch (e) {
      showAlert('Failed to remove rate.');
    }
  };

  const handleAdd = async () => {
    const code = newCode.trim();
    const name = newName.trim();
    const rateValue = toRateNumber(newRate);

    if (!code) {
      showAlert('Code is required.');
      return;
    }
    if (!name) {
      showAlert('Name is required.');
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
      const saved = await upsertClassificationRate(code, name, rateValue);
      setRates((prev) => [...prev.filter((p) => p.code !== saved.code), saved]);
      setNewCode('');
      setNewName('');
      setNewRate('');
      showAlert('Classification added.');
    } catch (e) {
      showAlert('Failed to add classification.');
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
            Classification Rates
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage rates per land classification. MSSQL classifications are read-only; rates are stored in Supabase.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
          <CardHeader className="bg-background border-b border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Add Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Code</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. X" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. SPECIAL CLASS" />
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
          <CardHeader className="bg-background border-b border-border pb-4 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Rates Table
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={refresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-background border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground border-r border-border w-2/5">
                      Classification
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
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        No classifications found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.source}-${row.code}`} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 border-r border-border">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{row.code}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="font-medium text-foreground">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            value={draftRates[row.code] ?? ''}
                            onChange={(e) => setDraftRates((prev) => ({ ...prev, [row.code]: e.target.value }))}
                            className="h-8 text-xs"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <span className="text-muted-foreground">
                            {row.source === 'mssql' ? 'MSSQL' : 'Custom'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                              onClick={() => handleSaveRow(row)}
                              disabled={isSaving === row.code}
                              title="Save Rate"
                            >
                              {isSaving === row.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                    ))
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

export default ClassificationRatePage;
