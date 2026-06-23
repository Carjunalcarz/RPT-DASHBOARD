import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Layers, Loader2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/rptas/ui/card';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/modules/rptas/ui/dialog';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { toast } from 'sonner';
import { getMunicipalities, Municipality } from '@/services/landTaxService';
import {
  BldgUnitCostSetItemRecord,
  BldgUnitCostSetRecord,
  createBldgUnitCostSetItem,
  deleteBldgUnitCostSet,
  deleteBldgUnitCostSetItem,
  getBldgUnitCostSetById,
  listBldgUnitCostSetItems,
  listBldgUnitCostSets,
  restoreBldgUnitCostSet,
  restoreBldgUnitCostSetItem,
  updateBldgUnitCostSet,
  updateBldgUnitCostSetItem,
} from '@/modules/rptas/shared/services/bldgUnitCostService';
import { useNavigate } from 'react-router';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/modules/rptas/ui/tooltip';
import { useModulePermissions } from '@/hooks/useRBAC';

const BuildingUnitCostSetManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const perms = useModulePermissions('/rptas/references/building-unit-cost-sets');

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [city, setCity] = useState('');
  const [ordinanceNo, setOrdinanceNo] = useState('');
  const [debouncedOrdinanceNo, setDebouncedOrdinanceNo] = useState('');
  const [includeDeletedSets, setIncludeDeletedSets] = useState(false);

  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [sets, setSets] = useState<BldgUnitCostSetRecord[]>([]);
  const [setMeta, setSetMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isOpen, setIsOpen] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const [activeSet, setActiveSet] = useState<BldgUnitCostSetRecord | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [items, setItems] = useState<BldgUnitCostSetItemRecord[]>([]);
  const [itemsMeta, setItemsMeta] = useState({ total: 0, page: 1, pageSize: 200, totalPages: 1 });
  const [itemsPageIndex, setItemsPageIndex] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(200);
  const [includeDeletedItems, setIncludeDeletedItems] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [debouncedItemsSearch, setDebouncedItemsSearch] = useState('');

  const [isEditSetOpen, setIsEditSetOpen] = useState(false);
  const [editSet, setEditSet] = useState<{ id: string; ordinanceNo: string; ordinanceDate: string; ordinanceText: string }>({
    id: '',
    ordinanceNo: '',
    ordinanceDate: '',
    ordinanceText: '',
  });
  const [isSavingSet, setIsSavingSet] = useState(false);

  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ mode: 'create' | 'edit'; id: string; setId: string; strucType: string; bldgCode: string; bldgCodeDesc: string; unitValue: string; effDate: string }>({
    mode: 'create',
    id: '',
    setId: '',
    strucType: '',
    bldgCode: '',
    bldgCodeDesc: '',
    unitValue: '',
    effDate: '',
  });
  const [isSavingItem, setIsSavingItem] = useState(false);

  useEffect(() => {
    const next = ordinanceNo.trim();
    const handler = setTimeout(() => {
      setDebouncedOrdinanceNo((prev) => (prev === next ? prev : next));
      setPageIndex((prev) => (prev === 1 ? prev : 1));
    }, 350);
    return () => clearTimeout(handler);
  }, [ordinanceNo]);

  useEffect(() => {
    const next = itemsSearch.trim();
    const handler = setTimeout(() => {
      setDebouncedItemsSearch((prev) => (prev === next ? prev : next));
      setItemsPageIndex((prev) => (prev === 1 ? prev : 1));
    }, 250);
    return () => clearTimeout(handler);
  }, [itemsSearch]);

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

  const fetchSets = async () => {
    if (!perms.canSelect) {
      setSets([]);
      setSetMeta({ total: 0, page: 1, pageSize, totalPages: 1 });
      setIsLoadingSets(false);
      return;
    }
    setIsLoadingSets(true);
    try {
      const res = await listBldgUnitCostSets({
        page: pageIndex,
        limit: pageSize,
        city: city.trim() || undefined,
        ordinanceNo: debouncedOrdinanceNo || undefined,
        includeDeleted: includeDeletedSets,
      });

      setSets((res?.data || []) as BldgUnitCostSetRecord[]);
      setSetMeta({
        total: res?.pagination?.total ?? 0,
        page: res?.pagination?.page ?? pageIndex,
        pageSize: res?.pagination?.limit ?? pageSize,
        totalPages: res?.pagination?.totalPages ?? 1,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load unit cost sets';
      showAlert(msg);
      setSets([]);
      setSetMeta({ total: 0, page: 1, pageSize, totalPages: 1 });
    } finally {
      setIsLoadingSets(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [pageIndex, pageSize, city, debouncedOrdinanceNo, includeDeletedSets, perms.canSelect]);

  const openSet = async (id: string) => {
    setIsOpen(true);
    setActiveSetId(id);
    setActiveSet(null);
    setItems([]);
    setItemsPageIndex(1);
    setItemsSearch('');
    setDebouncedItemsSearch('');
    setIsLoadingItems(true);
    try {
      const [setRes, itemsRes] = await Promise.all([
        getBldgUnitCostSetById(id, { includeDeleted: includeDeletedSets }),
        listBldgUnitCostSetItems(id, { page: 1, limit: itemsPageSize, includeDeleted: includeDeletedItems, search: undefined }),
      ]);
      setActiveSet(setRes?.data || null);
      setItems(itemsRes?.data || []);
      setItemsMeta({
        total: itemsRes?.pagination?.total ?? 0,
        page: itemsRes?.pagination?.page ?? 1,
        pageSize: itemsRes?.pagination?.limit ?? itemsPageSize,
        totalPages: itemsRes?.pagination?.totalPages ?? 1,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load unit cost set';
      showAlert(msg);
      setIsOpen(false);
      setActiveSetId('');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const openEditSet = (s: BldgUnitCostSetRecord) => {
    setEditSet({
      id: s.id,
      ordinanceNo: String(s.ordinance_no || '').trim(),
      ordinanceDate: s.ordinance_date ? String(s.ordinance_date).slice(0, 10) : '',
      ordinanceText: String(s.ordinance_text || '').trim(),
    });
    setIsEditSetOpen(true);
  };

  const saveSet = async () => {
    if (!perms.canUpdate) {
      showAlert('You do not have permission to update this module.');
      return;
    }
    const no = editSet.ordinanceNo.trim();
    if (!/^\d{1,6}-\d{4}$/.test(no)) {
      showAlert('Invalid ordinanceNo format. Expected like 716-2024.');
      return;
    }
    const date = editSet.ordinanceDate ? editSet.ordinanceDate.slice(0, 10) : '';
    if (date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        showAlert('Invalid ordinanceDate. Expected YYYY-MM-DD.');
        return;
      }
    }
    const confirmed = await showConfirm({
      title: 'Update Unit Cost Set',
      message: 'Save changes to this set?',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setIsSavingSet(true);
    const toastId = toast.loading('Saving set...');
    try {
      const res = await updateBldgUnitCostSet(editSet.id, {
        ordinanceNo: no,
        ordinanceDate: date || undefined,
        ordinanceText: editSet.ordinanceText.trim() || undefined,
      });
      toast.success('Set updated', { id: toastId });
      setIsEditSetOpen(false);
      setSets((prev) => prev.map((x) => (x.id === editSet.id ? { ...x, ...(res.data as any) } : x)));
      if (activeSetId === editSet.id) {
        setActiveSet((prev) => (prev ? { ...prev, ...(res.data as any) } : prev));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update set';
      toast.error(msg, { id: toastId });
    } finally {
      setIsSavingSet(false);
    }
  };

  const openCreateItem = (setId: string) => {
    setEditItem({
      mode: 'create',
      id: '',
      setId,
      strucType: '',
      bldgCode: '',
      bldgCodeDesc: '',
      unitValue: '',
      effDate: '',
    });
    setIsEditItemOpen(true);
  };

  const openEditItem = (it: BldgUnitCostSetItemRecord) => {
    setEditItem({
      mode: 'edit',
      id: it.id,
      setId: it.set_id,
      strucType: String(it.struc_type || '').trim(),
      bldgCode: String(it.bldg_code || '').trim(),
      bldgCodeDesc: String(it.bldg_code_desc || '').trim(),
      unitValue: String(it.unit_value ?? ''),
      effDate: String(it.eff_date || '').slice(0, 10),
    });
    setIsEditItemOpen(true);
  };

  const saveItem = async () => {
    if (editItem.mode === 'create' && !perms.canInsert) {
      showAlert('You do not have permission to create items in this module.');
      return;
    }
    if (editItem.mode === 'edit' && !perms.canUpdate) {
      showAlert('You do not have permission to update items in this module.');
      return;
    }

    const strucType = editItem.strucType.trim();
    const bldgCode = editItem.bldgCode.trim();
    const effDate = editItem.effDate.slice(0, 10);
    const unitValue = Number(editItem.unitValue);

    if (!strucType) return showAlert('strucType is required.');
    if (!bldgCode) return showAlert('bldgCode is required.');
    if (!effDate || effDate.length !== 10) return showAlert('effDate is required (YYYY-MM-DD).');
    if (!Number.isFinite(unitValue)) return showAlert('unitValue must be a valid number.');

    const confirmed = await showConfirm({
      title: editItem.mode === 'create' ? 'Add Item' : 'Update Item',
      message: editItem.mode === 'create' ? 'Add this item to the set?' : 'Save changes to this item?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setIsSavingItem(true);
    const toastId = toast.loading(editItem.mode === 'create' ? 'Adding item...' : 'Updating item...');
    try {
      const payload = {
        strucType,
        bldgCode,
        bldgCodeDesc: editItem.bldgCodeDesc.trim() || null,
        unitValue,
        effDate,
      };
      if (editItem.mode === 'create') {
        const res = await createBldgUnitCostSetItem(editItem.setId, payload);
        toast.success('Item added', { id: toastId });
        setIsEditItemOpen(false);
        setItems((prev) => [res.data, ...prev]);
        setItemsMeta((prev) => ({ ...prev, total: prev.total + 1 }));
      } else {
        const res = await updateBldgUnitCostSetItem(editItem.setId, editItem.id, payload);
        toast.success('Item updated', { id: toastId });
        setIsEditItemOpen(false);
        setItems((prev) => prev.map((x) => (x.id === editItem.id ? res.data : x)));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save item';
      toast.error(msg, { id: toastId });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (it: BldgUnitCostSetItemRecord) => {
    if (!perms.canDelete) {
      showAlert('You do not have permission to delete items in this module.');
      return;
    }
    const confirmed = await showConfirm({
      title: 'Delete Item',
      message: 'Choose soft delete (hide) or hard delete (permanent) in the next step.',
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const soft = await showConfirm({
      title: 'Delete Mode',
      message: 'Soft delete this item? (Recommended)',
      confirmLabel: 'Soft Delete',
      cancelLabel: 'Hard Delete',
      variant: 'destructive',
    });
    const mode: 'soft' | 'hard' = soft ? 'soft' : 'hard';

    const toastId = toast.loading('Deleting item...');
    try {
      await deleteBldgUnitCostSetItem(it.set_id, it.id, mode);
      toast.success(mode === 'soft' ? 'Item soft-deleted' : 'Item deleted', { id: toastId });
      if (mode === 'soft' && includeDeletedItems) {
        const nowIso = new Date().toISOString();
        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, deleted_at: nowIso } : x)));
      } else {
        setItems((prev) => prev.filter((x) => x.id !== it.id));
        setItemsMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete item';
      toast.error(msg, { id: toastId });
    }
  };

  const fetchItemsPage = async (id: string, nextPage: number, nextLimit: number) => {
    if (!id) return;
    setIsLoadingItems(true);
    try {
      const itemsRes = await listBldgUnitCostSetItems(id, {
        page: nextPage,
        limit: nextLimit,
        includeDeleted: includeDeletedItems,
        search: debouncedItemsSearch || undefined,
      });
      setItems(itemsRes?.data || []);
      setItemsMeta({
        total: itemsRes?.pagination?.total ?? 0,
        page: itemsRes?.pagination?.page ?? nextPage,
        pageSize: itemsRes?.pagination?.limit ?? nextLimit,
        totalPages: itemsRes?.pagination?.totalPages ?? 1,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load set items';
      showAlert(msg);
      setItems([]);
      setItemsMeta({ total: 0, page: 1, pageSize: nextLimit, totalPages: 1 });
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !activeSetId) return;
    fetchItemsPage(activeSetId, itemsPageIndex, itemsPageSize);
  }, [itemsPageIndex, itemsPageSize, includeDeletedItems, debouncedItemsSearch]);

  const handleDeleteSet = async (id: string) => {
    if (!perms.canDelete) {
      showAlert('You do not have permission to delete this module.');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Unit Cost Set',
      message: 'Choose soft delete (hide) or hard delete (permanent) in the next step.',
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const soft = await showConfirm({
      title: 'Delete Mode',
      message: 'Soft delete this set? (Recommended)',
      confirmLabel: 'Soft Delete',
      cancelLabel: 'Hard Delete',
      variant: 'destructive',
    });
    const mode: 'soft' | 'hard' = soft ? 'soft' : 'hard';

    const toastId = toast.loading('Deleting unit cost set...');
    try {
      await deleteBldgUnitCostSet(id, mode);
      toast.success(mode === 'soft' ? 'Unit cost set soft-deleted' : 'Unit cost set deleted', { id: toastId });
      if (activeSetId === id) {
        setIsOpen(false);
        setActiveSetId('');
        setActiveSet(null);
        setItems([]);
      }
      if (mode === 'soft' && includeDeletedSets) {
        const nowIso = new Date().toISOString();
        setSets((prev) => prev.map((x) => (x.id === id ? { ...x, deleted_at: nowIso } : x)));
      } else {
        setSets((prev) => prev.filter((x) => x.id !== id));
        setSetMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete unit cost set';
      toast.error(msg, { id: toastId });
    }
  };

  const handleRestoreSet = async (id: string) => {
    if (!perms.canUpdate) {
      showAlert('You do not have permission to update this module.');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Restore Unit Cost Set',
      message: 'Restore this soft-deleted set?',
      confirmLabel: 'Restore',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    const toastId = toast.loading('Restoring unit cost set...');
    try {
      await restoreBldgUnitCostSet(id);
      toast.success('Unit cost set restored', { id: toastId });
      setSets((prev) => prev.map((x) => (x.id === id ? { ...x, deleted_at: null, deleted_by: null } : x)));
      if (activeSetId === id) {
        setActiveSet((prev) => (prev ? { ...prev, deleted_at: null, deleted_by: null } : prev));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to restore unit cost set';
      toast.error(msg, { id: toastId });
    }
  };

  const handleRestoreItem = async (it: BldgUnitCostSetItemRecord) => {
    if (!perms.canUpdate) {
      showAlert('You do not have permission to update items in this module.');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Restore Item',
      message: 'Restore this soft-deleted item?',
      confirmLabel: 'Restore',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    const toastId = toast.loading('Restoring item...');
    try {
      await restoreBldgUnitCostSetItem(it.set_id, it.id);
      toast.success('Item restored', { id: toastId });
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, deleted_at: null, deleted_by: null } : x)));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to restore item';
      toast.error(msg, { id: toastId });
    }
  };

  const cityName = useMemo(() => {
    const code = city.trim();
    if (!code) return '';
    return municipalities.find((m) => String(m.code).trim() === code)?.name || '';
  }, [city, municipalities]);

  const goToCreate = () => {
    if (!perms.canInsert) {
      showAlert('You do not have permission to create in this module.');
      return;
    }
    navigate('/dashboard/rptas/references/building-unit-cost');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <TooltipProvider>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Building Unit Cost Sets
              </CardTitle>
              <CardDescription>Browse created unit cost sets, review their items, and delete outdated sets.</CardDescription>
            </div>
            <Button type="button" onClick={goToCreate} className="h-9 text-xs">
              Create New Set
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-end gap-2 mb-4">
            <div className="flex gap-2 w-full lg:w-auto">
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPageIndex(1);
                }}
                className="h-9 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded px-2 w-full sm:w-44"
              >
                <option value="">All Cities</option>
                {municipalities.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code}
                  </option>
                ))}
              </select>
              <Input value={cityName} readOnly className="h-9 text-xs bg-muted/10 dark:bg-muted/20 border-border w-full sm:w-64" />
            </div>
            <Input
              value={ordinanceNo}
              onChange={(e) => setOrdinanceNo(e.target.value)}
              placeholder="Filter by Ordinance No. (e.g., 716-2024)"
              className="h-9 text-xs bg-surface dark:bg-surface border-border w-full lg:w-72"
            />
            <label className="flex items-center gap-2 text-xs text-muted whitespace-nowrap select-none">
              <input
                type="checkbox"
                checked={includeDeletedSets}
                onChange={(e) => {
                  setIncludeDeletedSets(e.target.checked);
                  setPageIndex(1);
                }}
              />
              Show deleted
            </label>
          </div>

          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[110px]">City</th>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[140px]">Ordinance</th>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[130px]">Ordinance Date</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Text</th>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[180px]">Created</th>
                  <th className="px-3 py-2 text-right font-medium text-muted w-[240px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingSets ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mb-2" />
                        <p>Loading sets...</p>
                      </div>
                    </td>
                  </tr>
                ) : sets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      No sets found
                    </td>
                  </tr>
                ) : (
                  sets.map((s) => {
                    const ordDate = s.ordinance_date ? String(s.ordinance_date).slice(0, 10) : '';
                    const createdAt = s.created_at ? new Date(s.created_at).toLocaleString() : '';
                    const isDeleted = Boolean((s as any).deleted_at);
                    return (
                      <tr key={s.id} className={`bg-background hover:bg-muted/10 transition-colors${isDeleted ? ' opacity-60' : ''}`}>
                        <td className="px-3 py-2 border-r border-border font-mono">{s.city}</td>
                        <td className="px-3 py-2 border-r border-border font-mono">{s.ordinance_no}</td>
                        <td className="px-3 py-2 border-r border-border font-mono text-muted">{ordDate}</td>
                        <td className="px-3 py-2 border-r border-border text-foreground truncate max-w-[520px]">{s.ordinance_text}</td>
                        <td className="px-3 py-2 border-r border-border text-muted">
                          <div className="flex flex-col">
                            <span className="font-mono">{createdAt}</span>
                            <span className="text-[11px]">{s.created_by || ''}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="outline" className="h-8 w-9 px-0" onClick={() => openSet(s.id)} aria-label="View set details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 w-9 px-0"
                                  disabled={!perms.canUpdate || isDeleted}
                                  onClick={() => openEditSet(s)}
                                  aria-label="Edit set"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="h-8 w-9 px-0"
                                  disabled={!perms.canDelete || isDeleted}
                                  onClick={() => handleDeleteSet(s.id)}
                                  aria-label="Delete set"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>

                            {isDeleted ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 w-9 px-0"
                                    disabled={!perms.canUpdate}
                                    onClick={() => handleRestoreSet(s.id)}
                                    aria-label="Restore set"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <DataTablePagination
              pageIndex={setMeta.page}
              pageSize={setMeta.pageSize}
              totalCount={setMeta.total}
              totalPages={setMeta.totalPages}
              setPageIndex={setPageIndex}
              setPageSize={setPageSize}
              isLoading={isLoadingSets}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={(v) => {
          setIsOpen(v);
          if (!v) {
            setActiveSetId('');
            setActiveSet(null);
            setItems([]);
        setItemsSearch('');
        setDebouncedItemsSearch('');
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Unit Cost Set</DialogTitle>
            <DialogDescription>Review items in the selected unit cost set.</DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted">
            {activeSet ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  City: <span className="font-mono text-foreground">{activeSet.city}</span>
                </span>
                <span>
                  Ordinance: <span className="font-mono text-foreground">{activeSet.ordinance_no}</span>
                </span>
                <span>
                  Date:{' '}
                  <span className="font-mono text-foreground">{activeSet.ordinance_date ? String(activeSet.ordinance_date).slice(0, 10) : ''}</span>
                </span>
              </div>
            ) : (
              <span className="text-muted">Loading set details...</span>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted">{itemsMeta.total} item(s)</div>
                <Input
                  value={itemsSearch}
                  onChange={(e) => setItemsSearch(e.target.value)}
                  placeholder="Search items..."
                  className="h-8 text-xs w-64 bg-surface dark:bg-surface border-border"
                />
                <label className="flex items-center gap-2 text-xs text-muted whitespace-nowrap select-none">
                  <input
                    type="checkbox"
                    checked={includeDeletedItems}
                    onChange={(e) => {
                      setIncludeDeletedItems(e.target.checked);
                      setItemsPageIndex(1);
                    }}
                  />
                  Show deleted
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      className="h-8 text-xs"
                      disabled={!perms.canInsert || !activeSetId}
                      onClick={() => openCreateItem(activeSetId)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Item</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto border border-border rounded-md">
              <table className="w-full text-xs min-w-[820px]">
                <thead className="bg-background border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[120px]">Structure</th>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[120px]">Bldg Code</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-muted w-[140px]">Unit Value</th>
                  <th className="px-3 py-2 text-left font-medium text-muted w-[140px]">Eff Date</th>
                  <th className="px-3 py-2 text-right font-medium text-muted w-[130px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingItems ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mb-2" />
                        <p>Loading items...</p>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      No items found
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className={`bg-background hover:bg-muted/10 transition-colors${it.deleted_at ? ' opacity-60' : ''}`}>
                      <td className="px-3 py-2 border-r border-border font-mono">{it.struc_type}</td>
                      <td className="px-3 py-2 border-r border-border font-mono">{it.bldg_code}</td>
                      <td className="px-3 py-2 border-r border-border text-foreground">{it.bldg_code_desc || ''}</td>
                      <td className="px-3 py-2 border-r border-border text-right font-mono text-foreground">
                        {Number(it.unit_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted">{String(it.eff_date || '').slice(0, 10)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                                  <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-9 px-0"
                                onClick={() =>
                                  showAlert({
                                    title: 'Item Details',
                                    message: `Structure: ${it.struc_type}\nBldg Code: ${it.bldg_code}\nEff Date: ${String(it.eff_date || '').slice(0, 10)}\nUnit Value: ${Number(it.unit_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nCreated: ${it.created_at ? new Date(it.created_at).toLocaleString() : ''}\nUpdated: ${it.updated_at ? new Date(String(it.updated_at)).toLocaleString() : ''}\nDeleted: ${it.deleted_at ? new Date(String(it.deleted_at)).toLocaleString() : ''}`,
                                  })
                                }
                                  aria-label="View item details"
                                  >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="outline" className="h-8 w-9 px-0" onClick={() => openEditItem(it)} disabled={!perms.canUpdate || Boolean(it.deleted_at)} aria-label="Edit item">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="destructive" className="h-8 w-9 px-0" onClick={() => handleDeleteItem(it)} disabled={!perms.canDelete || Boolean(it.deleted_at)} aria-label="Delete item">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                          {it.deleted_at ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 w-9 px-0"
                                  disabled={!perms.canUpdate}
                                  onClick={() => handleRestoreItem(it)}
                                  aria-label="Restore item"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restore</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

            <div className="shrink-0">
              <DataTablePagination
                pageIndex={itemsMeta.page}
                pageSize={itemsMeta.pageSize}
                totalCount={itemsMeta.total}
                totalPages={itemsMeta.totalPages}
                setPageIndex={setItemsPageIndex}
                setPageSize={setItemsPageSize}
                isLoading={isLoadingItems}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSetOpen} onOpenChange={setIsEditSetOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-set">
          <DialogHeader>
            <DialogTitle>Edit Unit Cost Set</DialogTitle>
            <DialogDescription>Update ordinance details for this unit cost set.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Input
              value={editSet.ordinanceNo}
              onChange={(e) => setEditSet((p) => ({ ...p, ordinanceNo: e.target.value }))}
              placeholder="Ordinance No. (e.g., 716-2024)"
              className="h-9 text-xs"
              data-testid="input-set-ordinance-no"
            />
            <Input
              type="date"
              value={editSet.ordinanceDate}
              onChange={(e) => setEditSet((p) => ({ ...p, ordinanceDate: e.target.value }))}
              className="h-9 text-xs"
              data-testid="input-set-ordinance-date"
            />
            <Input
              value={editSet.ordinanceText}
              onChange={(e) => setEditSet((p) => ({ ...p, ordinanceText: e.target.value }))}
              placeholder="Ordinance text"
              className="h-9 text-xs"
              data-testid="input-set-ordinance-text"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditSetOpen(false)} disabled={isSavingSet} data-testid="btn-cancel-set">
              Cancel
            </Button>
            <Button type="button" onClick={saveSet} disabled={isSavingSet} data-testid="btn-save-set">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-item">
          <DialogHeader>
            <DialogTitle>{editItem.mode === 'create' ? 'Add Item' : 'Edit Item'}</DialogTitle>
            <DialogDescription>{editItem.mode === 'create' ? 'Add a new item to this set.' : 'Update the selected set item.'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Input
              value={editItem.strucType}
              onChange={(e) => setEditItem((p) => ({ ...p, strucType: e.target.value }))}
              placeholder="Structure Type"
              className="h-9 text-xs"
              data-testid="input-item-struc-type"
            />
            <Input
              value={editItem.bldgCode}
              onChange={(e) => setEditItem((p) => ({ ...p, bldgCode: e.target.value }))}
              placeholder="Bldg Code"
              className="h-9 text-xs"
              data-testid="input-item-bldg-code"
            />
            <Input
              value={editItem.bldgCodeDesc}
              onChange={(e) => setEditItem((p) => ({ ...p, bldgCodeDesc: e.target.value }))}
              placeholder="Description"
              className="h-9 text-xs"
              data-testid="input-item-desc"
            />
            <Input
              value={editItem.unitValue}
              onChange={(e) => setEditItem((p) => ({ ...p, unitValue: e.target.value }))}
              placeholder="Unit Value"
              className="h-9 text-xs"
              data-testid="input-item-unit-value"
            />
            <Input
              type="date"
              value={editItem.effDate}
              onChange={(e) => setEditItem((p) => ({ ...p, effDate: e.target.value }))}
              className="h-9 text-xs"
              data-testid="input-item-eff-date"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditItemOpen(false)} disabled={isSavingItem} data-testid="btn-cancel-item">
              Cancel
            </Button>
            <Button type="button" onClick={saveItem} disabled={isSavingItem} data-testid="btn-save-item">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
    </div>
  );
};

export default BuildingUnitCostSetManagementPage;
