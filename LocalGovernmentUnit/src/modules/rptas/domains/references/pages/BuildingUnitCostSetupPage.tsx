import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Search } from 'lucide-react';
import { Input } from '@/modules/rptas/ui/input';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import { getMunicipalities, Municipality } from '@/services/landTaxService';
import { getBldgStrucTypes, BldgStrucTypeRecord } from '@/modules/rptas/shared/services/bldgStrucTypeService';
import { createBldgUnitCostSet, getBldgUnitCosts, getDistinctBldgUnitCostEffDates, BldgUnitCostRecord } from '@/modules/rptas/shared/services/bldgUnitCostService';
import { toast } from 'sonner';
import { Button } from '@/modules/rptas/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/modules/rptas/ui/dialog';

const BuildingUnitCostSetupPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<BldgUnitCostRecord[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [strucTypes, setStrucTypes] = useState<BldgStrucTypeRecord[]>([]);

  const [cityCode, setCityCode] = useState('');
  const [strucType, setStrucType] = useState('');
  const [bldgCode, setBldgCode] = useState('');
  const [debouncedBldgCode, setDebouncedBldgCode] = useState('');
  const [effDate, setEffDate] = useState('');
  const [effDateOptions, setEffDateOptions] = useState<string[]>([]);
  const [selectedByKey, setSelectedByKey] = useState<Record<string, { city: string; strucType: string; bldgCode: string; bldgCodeDesc?: string | null; unitValue: number; effDate: string }>>({});
  const [ordinanceNo, setOrdinanceNo] = useState('');
  const [ordinanceDate, setOrdinanceDate] = useState('');
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [sort, setSort] = useState<{ key: 'City' | 'StrucType' | 'BldgCode' | 'UNIT_VALUE' | 'Eff_Date'; dir: 'asc' | 'desc' }>({
    key: 'StrucType',
    dir: 'asc',
  });

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const next = bldgCode.trim();
    const handler = setTimeout(() => {
      setDebouncedBldgCode((prev) => (prev === next ? prev : next));
      setPageIndex((prev) => (prev === 1 ? prev : 1));
    }, 400);
    return () => clearTimeout(handler);
  }, [bldgCode]);

  useEffect(() => {
    let alive = true;
    getMunicipalities()
      .then((list) => {
        if (!alive) return;
        setMunicipalities(list || []);
      })
      .catch(() => {
        if (!alive) return;
        setMunicipalities([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const city = cityCode.trim();
    getBldgStrucTypes({ page: 1, limit: 2000, city: city || undefined })
      .then((res) => {
        if (!alive) return;
        setStrucTypes(res?.data || []);
      })
      .catch(() => {
        if (!alive) return;
        setStrucTypes([]);
      });
    return () => {
      alive = false;
    };
  }, [cityCode]);

  useEffect(() => {
    setSelectedByKey({});
  }, [cityCode]);

  const strucTypeDescriptionByCode = useMemo(() => {
    const map = new Map<string, string>();
    (strucTypes || []).forEach((t) => {
      const code = String((t as any).Code || '').trim();
      const desc = String((t as any).Description || '').trim();
      if (code) map.set(code, desc);
    });
    return map;
  }, [strucTypes]);

  const strucTypeOptions = useMemo(() => {
    const unique = new Map<string, BldgStrucTypeRecord>();
    (strucTypes || []).forEach((t) => {
      const code = String((t as any).Code || '').trim();
      if (!code) return;
      if (!unique.has(code)) unique.set(code, t);
    });
    return [...unique.values()].sort((a, b) => String((a as any).Code).localeCompare(String((b as any).Code)));
  }, [strucTypes]);

  const fallbackEffDateOptions = useMemo(() => {
    const unique = new Set<string>();
    (records || []).forEach((r) => {
      const eff = String((r as any).Eff_Date || '').slice(0, 10);
      if (eff) unique.add(eff);
    });
    return [...unique].sort((a, b) => b.localeCompare(a));
  }, [records]);

  const sortedRecords = useMemo(() => {
    const list = [...(records || [])];
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av: any = (a as any)[key];
      const bv: any = (b as any)[key];
      if (key === 'UNIT_VALUE') return (Number(av || 0) - Number(bv || 0)) * mult;
      return String(av || '').localeCompare(String(bv || ''), undefined, { sensitivity: 'base' }) * mult;
    });
    return list;
  }, [records, sort]);

  const pageKeys = useMemo(() => {
    return (sortedRecords || []).map((r) => {
      const city = String((r as any).City || '').trim();
      const st = String((r as any).StrucType || '').trim();
      const bc = String((r as any).BldgCode || '').trim();
      const eff = String((r as any).Eff_Date || '').slice(0, 10);
      const uv = Number((r as any).UNIT_VALUE || 0);
      return `${city}|${st}|${bc}|${eff}|${uv}`;
    });
  }, [sortedRecords]);

  const selectedCount = useMemo(() => Object.keys(selectedByKey).length, [selectedByKey]);
  const isAllPageSelected = useMemo(() => pageKeys.length > 0 && pageKeys.every((k) => Boolean(selectedByKey[k])), [pageKeys, selectedByKey]);

  const toggleSort = (key: 'City' | 'StrucType' | 'BldgCode' | 'UNIT_VALUE' | 'Eff_Date') => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const fetchUnitCosts = async () => {
    setIsLoading(true);
    try {
      const response = await getBldgUnitCosts({
        page: pageIndex,
        limit: pageSize,
        city: cityCode.trim() || undefined,
        strucType: strucType.trim() || undefined,
        bldgCode: debouncedBldgCode || undefined,
        effDate: effDate || undefined,
      });

      setRecords(response?.data || []);
      const pagination = response?.pagination;
      setMeta({
        total: pagination?.total ?? 0,
        page: pagination?.page ?? pageIndex,
        pageSize: pagination?.limit ?? pageSize,
        totalPages: pagination?.totalPages ?? 1,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitCosts();
  }, [cityCode, debouncedBldgCode, effDate, pageIndex, pageSize, strucType]);

  useEffect(() => {
    let alive = true;
    getDistinctBldgUnitCostEffDates({
      city: cityCode.trim() || undefined,
      strucType: strucType.trim() || undefined,
      bldgCode: debouncedBldgCode || undefined,
    })
      .then((res) => {
        if (!alive) return;
        setEffDateOptions(res?.data || []);
      })
      .catch(() => {
        if (!alive) return;
        setEffDateOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [cityCode, debouncedBldgCode, strucType]);

  const cityName = useMemo(() => {
    const code = cityCode.trim();
    if (!code) return '';
    return municipalities.find((m) => String(m.code).trim() === code)?.name || '';
  }, [cityCode, municipalities]);

  const ordinanceNoError = useMemo(() => {
    const v = ordinanceNo.trim();
    if (!v) return 'Ordinance No. is required';
    if (!/^\d{1,6}-\d{4}$/.test(v)) return 'Invalid format. Expected like 716-2024';
    return '';
  }, [ordinanceNo]);

  const selectedItemsPayload = useMemo(() => {
    return Object.values(selectedByKey);
  }, [selectedByKey]);

  const handleToggleRow = (r: BldgUnitCostRecord) => {
    const city = String((r as any).City || '').trim();
    const strucTypeVal = String((r as any).StrucType || '').trim();
    const bldgCodeVal = String((r as any).BldgCode || '').trim();
    const bldgCodeDescVal = String((r as any).BldgCodeDesc || '').trim();
    const eff = String((r as any).Eff_Date || '').slice(0, 10);
    const unitValue = Number((r as any).UNIT_VALUE || 0);
    const key = `${city}|${strucTypeVal}|${bldgCodeVal}|${eff}|${unitValue}`;

    setSelectedByKey((prev) => {
      if (prev[key]) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: {
          city,
          strucType: strucTypeVal,
          bldgCode: bldgCodeVal,
          bldgCodeDesc: bldgCodeDescVal || null,
          unitValue,
          effDate: eff,
        },
      };
    });
  };

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedByKey((prev) => {
        const next = { ...prev };
        pageKeys.forEach((k) => {
          delete next[k];
        });
        return next;
      });
      return;
    }

    const nextAdds: Record<string, any> = {};
    sortedRecords.forEach((r) => {
      const city = String((r as any).City || '').trim();
      const strucTypeVal = String((r as any).StrucType || '').trim();
      const bldgCodeVal = String((r as any).BldgCode || '').trim();
      const bldgCodeDescVal = String((r as any).BldgCodeDesc || '').trim();
      const eff = String((r as any).Eff_Date || '').slice(0, 10);
      const unitValue = Number((r as any).UNIT_VALUE || 0);
      const key = `${city}|${strucTypeVal}|${bldgCodeVal}|${eff}|${unitValue}`;
      nextAdds[key] = {
        city,
        strucType: strucTypeVal,
        bldgCode: bldgCodeVal,
        bldgCodeDesc: bldgCodeDescVal || null,
        unitValue,
        effDate: eff,
      };
    });

    setSelectedByKey((prev) => ({ ...nextAdds, ...prev }));
  };

  const handleCreateSet = async () => {
    if (selectedCount === 0) {
      toast.error('Select at least one unit cost item.');
      return;
    }
    if (ordinanceNoError) {
      toast.error(ordinanceNoError);
      return;
    }

    setIsCreatingSet(true);
    const toastId = toast.loading('Creating unit cost set...');
    try {
      const res = await createBldgUnitCostSet({
        ordinanceNo: ordinanceNo.trim(),
        ordinanceDate: ordinanceDate || undefined,
        ordinanceText: ordinanceDate ? `${ordinanceNo.trim()} • ${ordinanceDate}` : ordinanceNo.trim(),
        items: selectedItemsPayload,
      });
      toast.success(`Created unit cost set (${res.data.itemCount} items)`, { id: toastId });
      setSelectedByKey({});
      setOrdinanceNo('');
      setOrdinanceDate('');
      setShowConfirmCreate(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create unit cost set';
      toast.error(msg, { id: toastId });
    } finally {
      setIsCreatingSet(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Building Unit Cost Setup
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse building unit cost reference values by municipality, structure type, and building code.
          </p>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
        <div className="bg-background dark:bg-background border-b border-border dark:border-border px-4 py-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-foreground tracking-wide">Unit Cost Records</h3>

            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={cityCode}
                  onChange={(e) => {
                    setCityCode(e.target.value);
                    setPageIndex(1);
                  }}
                  className="h-8 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded px-2 w-full sm:w-40"
                  data-testid="filter-city"
                >
                  <option value="">All Cities</option>
                  {municipalities.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code}
                    </option>
                  ))}
                </select>
                <Input
                  value={cityName}
                  readOnly
                  className="h-8 text-xs bg-muted/10 dark:bg-muted/20 border-border dark:border-border w-full sm:w-56"
                  data-testid="filter-city-name"
                />
              </div>

              <select
                value={strucType}
                onChange={(e) => {
                  setStrucType(e.target.value);
                  setPageIndex(1);
                }}
                className="h-8 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded px-2 w-full sm:w-56"
                data-testid="filter-struc-type"
              >
                <option value="">All Structure Types</option>
                {strucTypeOptions.map((s) => {
                  const code = String((s as any).Code || '').trim();
                  const desc = String((s as any).Description || '').trim();
                  return (
                    <option key={code} value={code}>
                      {desc ? `${code} - ${desc}` : code}
                    </option>
                  );
                })}
              </select>

              <select
                value={effDate}
                onChange={(e) => {
                  setEffDate(e.target.value);
                  setPageIndex(1);
                }}
                className="h-8 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded px-2 w-full sm:w-44"
                data-testid="filter-eff-date"
              >
                <option value="">All Eff Dates</option>
                {(effDateOptions.length > 0 ? effDateOptions : fallbackEffDateOptions).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted dark:text-muted" />
                <Input
                  placeholder="Filter by Bldg Code (exact)..."
                  className="pl-9 h-8 text-xs bg-surface dark:bg-surface border-border dark:border-border"
                  value={bldgCode}
                  onChange={(e) => setBldgCode(e.target.value)}
                  data-testid="filter-bldg-code"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="text-xs text-muted dark:text-muted">
              Selected: <span className="font-medium text-foreground">{selectedCount}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Input
                value={ordinanceNo}
                onChange={(e) => setOrdinanceNo(e.target.value)}
                placeholder="Ordinance No. (e.g., 716-2024)"
                className="h-8 text-xs bg-surface dark:bg-surface border-border dark:border-border w-full sm:w-56"
                data-testid="input-ordinance-no"
              />
              <Input
                type="date"
                value={ordinanceDate}
                onChange={(e) => setOrdinanceDate(e.target.value)}
                className="h-8 text-xs bg-surface dark:bg-surface border-border dark:border-border w-full sm:w-44"
                data-testid="input-ordinance-date"
              />
              <Button
                type="button"
                className="h-8 text-xs"
                disabled={selectedCount === 0 || Boolean(ordinanceNoError) || isCreatingSet}
                onClick={() => setShowConfirmCreate(true)}
                data-testid="btn-create-unit-cost-set"
              >
                Create Set
              </Button>
            </div>
            {ordinanceNoError ? (
              <div className="text-xs text-destructive" data-testid="ordinance-error">
                {ordinanceNoError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-background dark:bg-background border-b border-border dark:border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[42px]">
                  <input type="checkbox" checked={isAllPageSelected} onChange={handleToggleSelectAllPage} />
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[120px] cursor-pointer" onClick={() => toggleSort('City')}>
                  City
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[220px] cursor-pointer" onClick={() => toggleSort('StrucType')}>
                  Structure Type
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[120px] cursor-pointer" onClick={() => toggleSort('BldgCode')}>
                  Bldg Code
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">Description</th>
                <th className="px-3 py-2 text-right font-medium text-muted dark:text-muted w-[140px] cursor-pointer" onClick={() => toggleSort('UNIT_VALUE')}>
                  Unit Value
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[140px] cursor-pointer" onClick={() => toggleSort('Eff_Date')}>
                  Eff Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted dark:text-muted">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mb-2" />
                      <p>Loading unit costs...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted dark:text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-6 w-6 opacity-50 mb-1" />
                      <p className="font-medium">No unit costs found</p>
                      <p className="text-xs opacity-75">Try adjusting your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r, idx) => {
                  const code = String((r as any).StrucType || '').trim();
                  const desc = strucTypeDescriptionByCode.get(code) || '';
                  const eff = String((r as any).Eff_Date || '').slice(0, 10);
                  const city = String((r as any).City || '').trim();
                  const bc = String((r as any).BldgCode || '').trim();
                  const uv = Number((r as any).UNIT_VALUE || 0);
                  const rowKey = `${city}|${code}|${bc}|${eff}|${uv}`;

                  return (
                    <tr
                      key={`${rowKey}|${idx}`}
                      className="bg-background dark:bg-background/30 hover:bg-muted/10 dark:hover:bg-background transition-colors"
                    >
                      <td className="px-3 py-2 border-r border-border dark:border-border">
                        <input type="checkbox" checked={Boolean(selectedByKey[rowKey])} onChange={() => handleToggleRow(r)} />
                      </td>
                      <td className="px-3 py-2 border-r border-border dark:border-border font-mono text-xs">
                        {city}
                      </td>
                      <td className="px-3 py-2 border-r border-border dark:border-border">
                        <div className="flex gap-1">
                          <span className="font-mono text-muted-foreground">{code}</span>
                          {desc ? <span className="text-foreground truncate">- {desc}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-border dark:border-border font-mono">
                        {bc}
                      </td>
                      <td className="px-3 py-2 border-r border-border dark:border-border text-foreground">
                        {String((r as any).BldgCodeDesc || '')}
                      </td>
                      <td className="px-3 py-2 border-r border-border dark:border-border text-right font-mono text-foreground">
                        {uv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-muted dark:text-muted font-mono">
                        {eff || ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border dark:border-border p-3 bg-background dark:bg-background">
          <DataTablePagination
            pageIndex={meta.page}
            pageSize={meta.pageSize}
            totalCount={meta.total}
            totalPages={meta.totalPages}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </div>

      <Dialog open={showConfirmCreate} onOpenChange={setShowConfirmCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Building Unit Cost Set</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">City:</span> <span className="font-medium">{cityCode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ordinance:</span> <span className="font-medium">{ordinanceNo.trim()}</span>
              {ordinanceDate ? <span className="text-muted-foreground"> • </span> : null}
              {ordinanceDate ? <span className="font-medium">{ordinanceDate}</span> : null}
            </div>
            <div>
              <span className="text-muted-foreground">Selected items:</span> <span className="font-medium">{selectedCount}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowConfirmCreate(false)} disabled={isCreatingSet}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateSet} disabled={isCreatingSet}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuildingUnitCostSetupPage;
