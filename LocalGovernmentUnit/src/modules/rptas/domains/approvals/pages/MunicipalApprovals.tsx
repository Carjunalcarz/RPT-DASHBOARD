import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { listFaasRecords, batchUpdateFaasStatus, updateFaasStatus } from '@/modules/rptas/shared/services/faasService';
import { FileText, User, Calendar, ArrowRight, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import { Checkbox } from '@/modules/rptas/ui/checkbox';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { listSetupSignatories, type SetupSignatory } from '@/modules/rptas/shared/services/setupSignatoriesService';
import { toast } from 'sonner';

const MunicipalApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm } = useAlert();

  const MUNICIPAL_ASSESSOR_DEPARTMENT = 'Municipal Assessor Office';
  const SIGNATORY_STORAGE_KEY = 'rptas.municipalApproval.signatoryId';
  
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const statusFilter = 'pending-municipal';
  
  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('');

  const { data: signatoriesResponse, isLoading: isSignatoriesLoading } = useSWR(
    ['setup-signatories', 'municipal-assessor'],
    () => listSetupSignatories({ department: MUNICIPAL_ASSESSOR_DEPARTMENT, isActive: 'true', page: 1, limit: 200 }),
    { revalidateOnFocus: false }
  );

  const signatories = useMemo(() => signatoriesResponse?.data || [], [signatoriesResponse?.data]);

  useEffect(() => {
    if (!signatories.length) return;
    const stored = (() => {
      try {
        return localStorage.getItem(SIGNATORY_STORAGE_KEY) || '';
      } catch {
        return '';
      }
    })();

    const preferred = stored && signatories.some(s => s.id === stored) ? stored : signatories[0].id;
    if (preferred && preferred !== selectedSignatoryId) {
      setSelectedSignatoryId(preferred);
    }
  }, [selectedSignatoryId, signatories]);

  const selectedSignatory = useMemo<SetupSignatory | null>(() => {
    return signatories.find(s => s.id === selectedSignatoryId) || null;
  }, [selectedSignatoryId, signatories]);

  const signatoryMeta = useMemo(() => {
    return {
      approverName: selectedSignatory?.name,
      approverPosition: selectedSignatory?.title,
    };
  }, [selectedSignatory?.name, selectedSignatory?.title]);

  const canForward = Boolean(signatoryMeta.approverName);

  // Fetch records based on selected status
  const { data, error, isLoading, mutate } = useSWR(
    ['pending-municipal-approvals', pagination.page, pagination.limit],
    ([, page, limit]) => {
        return listFaasRecords({ page, limit, status: statusFilter });
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: true,
    }
  );

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setSelectedIds(new Set()); // Clear selection on page change
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, limit: newSize }));
    setSelectedIds(new Set()); // Clear selection on page size change
  };

  const handleReview = (id: string) => {
    navigate(`/dashboard/rptas/property-approval?id=${id}`);
  };

  const handleApproveOne = async (id: string) => {
    if (!canForward) {
      toast.error('Please select a Municipal Assessor signatory first.');
      return;
    }
    const confirmed = await showConfirm({
      title: 'Forward to Provincial',
      message: 'Are you sure you want to forward this property to Provincial review?',
      confirmLabel: 'Forward',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setProcessingIds(prev => new Set(prev).add(id));

    const toastId = toast.loading('Forwarding property...');
    try {
      const nextStatus = 'pending-provincial';

      mutate(
        (currentData: any) => {
          if (!currentData) return currentData;
          const existed = Array.isArray(currentData.data) && currentData.data.some((r: any) => r.id === id);
          return {
            ...currentData,
            data: (currentData.data || []).filter((record: any) => record.id !== id),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, (currentData.pagination?.total || 0) - (existed ? 1 : 0)),
            },
          };
        },
        false
      );

      await updateFaasStatus(
        id,
        nextStatus as any,
        'Municipal Forward',
        signatoryMeta
      );
      toast.success('Property forwarded to Provincial.', { id: toastId });
      mutate();
    } catch (error) {
      toast.error('Failed to forward property.', { id: toastId });
      mutate();
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const records = data?.data || [];
  const totalRecords = data?.pagination?.total || 0;

  // Bulk Action Handlers
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      // Select all visible records
      const allIds = new Set<string>(records.map((r: any) => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!canForward) {
      toast.error('Please select a Municipal Assessor signatory first.');
      return;
    }

    const confirmed = await showConfirm({
      title: `Bulk Forward`,
      message: `Are you sure you want to forward ${selectedIds.size} selected properties to Provincial review?`,
      confirmLabel: `Forward ${selectedIds.size} Items`,
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    setIsBulkProcessing(true);
    const toastId = toast.loading('Processing bulk approval...');

    try {
      const nextStatus = 'pending-provincial';

      // Optimistic UI Update: immediately remove selected items from view
      mutate(
        (currentData: any) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.filter((record: any) => !selectedIds.has(record.id)),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - selectedIds.size)
            }
          };
        },
        false // Do not revalidate immediately, wait for actual response
      );

      const result = await batchUpdateFaasStatus(
        Array.from(selectedIds),
        nextStatus as any,
        'Bulk Action',
        signatoryMeta
      );

      if (result.failed.length === 0) {
        toast.success(`Successfully forwarded ${result.success.length} items.`, { id: toastId });
      } else if (result.success.length > 0) {
        toast.warning(
          `${result.success.length} processed, but ${result.failed.length} failed.`,
          { id: toastId }
        );
        // If some failed, we should revalidate to show them back
        mutate(); 
      } else {
        toast.error('Failed to process selected items.', { id: toastId });
        mutate(); // Revert optimistic update on total failure
      }

      // Refresh data (final consistency check)
      setSelectedIds(new Set());
      if (result.failed.length === 0) {
          mutate(); 
      }

    } catch (error) {
      console.error('Bulk approval error:', error);
      toast.error('An unexpected error occurred during bulk processing.', { id: toastId });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const isAllSelected = records.length > 0 && selectedIds.size === records.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < records.length;

  const pageTitle = 'Municipal Approvals';
  const pageSubtitle = 'Review and forward properties to Provincial level.';

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-background dark:bg-background overflow-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <CheckCircle className="text-primary" />
            {pageTitle}
          </h1>
          <p className="text-muted dark:text-muted text-sm mt-1">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs font-medium text-muted dark:text-muted">
            Municipal Assessor (Signatory)
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedSignatoryId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedSignatoryId(nextId);
                try {
                  localStorage.setItem(SIGNATORY_STORAGE_KEY, nextId);
                } catch {
                  // ignore
                }
              }}
              disabled={isSignatoriesLoading || signatories.length === 0 || isBulkProcessing}
              className="min-w-[280px] px-3 py-2 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
                {isSignatoriesLoading ? (
                  <option value="">Loading signatories...</option>
                ) : signatories.length === 0 ? (
                  <option value="">No active signatories</option>
              ) : (
                signatories.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.title}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => navigate('/dashboard/rptas/setup-signatories')}
              className="px-3 py-2 text-xs font-medium bg-surface dark:bg-surface border border-border dark:border-border rounded-lg hover:bg-muted/10 dark:hover:bg-muted/20 transition-colors disabled:opacity-50"
              disabled={isBulkProcessing}
            >
              Setup
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 dark:bg-primary/5 border border-primary/20 dark:border-primary/20 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white dark:text-white">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium text-primary-light dark:text-white/80">
              Selected {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-muted dark:text-muted hover:text-foreground dark:hover:text-slate-200 transition-colors"
              disabled={isBulkProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={isBulkProcessing}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white dark:text-white bg-primary hover:bg-primary-light rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Forward Selected
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface dark:bg-background rounded-xl shadow-sm border border-border dark:border-border overflow-hidden flex flex-col">
        {error ? (
          <div className="p-4 border-b border-border dark:border-border bg-danger/10 dark:bg-red-900/10">
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Failed to load approvals</div>
                <div className="text-xs mt-0.5 opacity-90">{String((error as any)?.message || 'Unknown error')}</div>
              </div>
              <button
                onClick={() => mutate()}
                className="px-3 py-1.5 text-xs font-medium bg-surface dark:bg-surface border border-danger/30 dark:border-danger/40 rounded-md hover:bg-danger/10 dark:hover:bg-red-900/20 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead
              className="text-white uppercase text-xs font-semibold bg-primary"
            >
              
              <tr>
                <th className="px-6 py-4 w-12">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAll}
                      className="border-white/50 data-[state=checked]:bg-surface data-[state=checked]:text-primary"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap">TDN / Reference</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Submitted By</th>
                <th className="px-6 py-4">Date Submitted</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-4 bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 mx-auto bg-muted/10 dark:bg-muted/20 rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 ml-auto bg-muted/10 dark:bg-muted/20 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted dark:text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="h-12 w-12 text-muted" />
                      <p>No pending approvals found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const innerData = record.data || {};
                  const isSelected = selectedIds.has(record.id);
                  const isRowProcessing = processingIds.has(record.id);
                  return (
                    <tr 
                      key={record.id}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-primary/5 dark:bg-primary-light/10 hover:bg-primary/5 dark:hover:bg-primary/5' 
                          : 'hover:bg-muted/5 dark:hover:bg-muted/20/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(record.id, checked as boolean)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-foreground dark:text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-muted" />
                          {record.tdn || innerData.tdn || innerData.TDN || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground dark:text-slate-100">
                        {innerData.owner || innerData.owner_name || 'Unknown Owner'}
                      </td>
                      <td className="px-6 py-4 text-muted dark:text-muted">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-muted" />
                          {record.createdBy || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted dark:text-muted">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted" />
                          {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary-light dark:bg-primary/10 dark:text-primary/80 border-primary/20 dark:border-primary/20">
                          <Clock size={12} />
                          Municipal Review
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReview(record.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm bg-primary hover:bg-primary-light"
                            disabled={isRowProcessing || isBulkProcessing}
                          >
                            Review
                            <ArrowRight size={14} />
                          </button>
                          <button
                            onClick={() => handleApproveOne(record.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isRowProcessing || isBulkProcessing}
                          >
                            {isRowProcessing ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Forwarding...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                Forward
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-border dark:border-border bg-background dark:bg-background/50">
           <DataTablePagination 
             pageIndex={pagination.page}
             pageSize={pagination.limit}
             totalCount={totalRecords}
             totalPages={Math.ceil(totalRecords / pagination.limit) || 1}
             setPageIndex={handlePageChange}
             setPageSize={handlePageSizeChange}
             isLoading={isLoading}
           />
        </div>
      </div>
    </div>
  );
};

export default MunicipalApprovals;
