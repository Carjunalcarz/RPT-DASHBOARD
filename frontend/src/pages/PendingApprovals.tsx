import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useSWR from 'swr';
import { listFaasRecords, batchUpdateFaasStatus } from '@/services/faasService';
import { useThemeColor } from '@/context/ThemeColorContext';
import { FileText, User, Calendar, ArrowRight, CheckCircle, Clock, FileEdit, Loader2, AlertCircle } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Checkbox } from '../components/ui/checkbox';
import { useAlert } from '@/context/AlertContext';
import { toast } from 'sonner';

const PendingApprovals: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<'pending-municipal' | 'pending-provincial' | 'draft'>('pending-municipal');
  
  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Handle incoming state for default tab
  useEffect(() => {
    if (location.state?.defaultTab) {
      const tab = location.state.defaultTab;
      if (tab === 'municipal') {
        setStatusFilter('pending-municipal');
      } else if (tab === 'provincial') {
        setStatusFilter('pending-provincial');
      }
      // Clear state so it doesn't persist on refresh if not intended
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch records based on selected status
  const { data, error, isLoading, mutate } = useSWR(
    ['pending-approvals', pagination.page, pagination.limit, statusFilter],
    ([_, page, limit, status]) => {
        // Map UI filter to backend status query
        // 'pending-municipal' matches 'pending-municipal'
        // But we might want to include 'for-review' (legacy) when filtering for municipal
        // The backend `listRecords` is simple exact match. 
        // For now, let's assume we migrated or just query exact status.
        return listFaasRecords({ page, limit, status });
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
    navigate(`/property-approval/${id}`);
  };

  const records = data?.data || [];
  const totalRecords = data?.pagination?.total || 0;

  // Bulk Action Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
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

    const confirmed = await showConfirm({
      title: 'Bulk Approval',
      message: `Are you sure you want to approve ${selectedIds.size} selected properties? This action cannot be undone efficiently.`,
      confirmLabel: `Approve ${selectedIds.size} Items`,
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    setIsBulkProcessing(true);
    const toastId = toast.loading('Processing bulk approval...');

    try {
      // Determine next status based on current filter
      let nextStatus: 'pending-provincial' | 'approved' | 'pending-municipal' = 'approved';
      if (statusFilter === 'pending-municipal') {
        nextStatus = 'pending-provincial';
      } else if (statusFilter === 'pending-provincial') {
        nextStatus = 'approved';
      } else {
        // Drafts usually go to pending-municipal
        // But the bulk action might be context specific. 
        // Assuming bulk approve moves forward.
        // If draft -> pending-municipal
        // But let's stick to the approval flow.
        // If we are in Drafts tab, maybe we don't allow bulk approve or it submits for review.
        // For simplicity, let's assume this button is only for review tabs.
        // But if user selects drafts, we should probably submit them.
        // Let's handle review tabs for now.
        // Actually, let's map it safely.
        if (statusFilter === 'draft') {
             // Drafts need to be submitted, not approved directly usually.
             // But if the requirement is "Bulk Approve", maybe it means "Submit" for drafts?
             // Let's assume standard flow: Draft -> Pending Municipal -> Pending Provincial -> Approved.
             // But listFaasRecords uses 'pending-municipal' etc.
             // updateFaasStatus uses these too.
             // If we are approving a 'draft', it implies skipping to approved? Unlikely.
             // Let's disable bulk approve for drafts or treat it as submit.
             // The prompt says "monitor for new properties pending approval", so likely focus is on approval tabs.
             // I'll stick to logic:
             // pending-municipal -> pending-provincial
             // pending-provincial -> approved
             // draft -> pending-municipal (Submit)
             nextStatus = 'pending-municipal';
        }
      }

      const result = await batchUpdateFaasStatus(Array.from(selectedIds), nextStatus as any, 'Bulk Action');

      if (result.failed.length === 0) {
        toast.success(`Successfully approved ${result.success.length} items.`, { id: toastId });
      } else if (result.success.length > 0) {
        toast.warning(`Approved ${result.success.length} items, but ${result.failed.length} failed.`, { id: toastId });
      } else {
        toast.error(`Failed to approve selected items.`, { id: toastId });
      }

      // Refresh data
      setSelectedIds(new Set());
      // Trigger SWR revalidation
      // We can use mutate from useSWRConfig or just wait for auto-revalidation if focus happens.
      // But better to force it. Since we don't have mutate bound here easily without prop drilling or global mutate,
      // we can rely on SWR's automatic revalidation if we just change something or invalidating cache.
      // Or we can just grab mutate from the useSWR call above.
      // Wait, 'mutate' is available from the useSWR hook call in this component!
      // I need to move this handler inside the component scope where 'mutate' is defined.
      // It IS inside. Good.
      mutate();

    } catch (error) {
      console.error('Bulk approval error:', error);
      toast.error('An unexpected error occurred during bulk processing.', { id: toastId });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const isAllSelected = records.length > 0 && selectedIds.size === records.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < records.length;

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-slate-50 dark:bg-slate-900 overflow-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle className="text-blue-600" />
            Approvals & Drafts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage pending approvals and review draft assessments.
          </p>
        </div>
        
        {/* Status Filter Tabs */}
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
          <button
            onClick={() => {
              setStatusFilter('pending-municipal');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              statusFilter === 'pending-municipal'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Clock size={16} />
            Municipal Review
          </button>
          <button
            onClick={() => {
              setStatusFilter('pending-provincial');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              statusFilter === 'pending-provincial'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle size={16} />
            Provincial Review
          </button>
          <button
            onClick={() => {
              setStatusFilter('draft');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              statusFilter === 'draft'
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <FileEdit size={16} />
            Drafts
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Selected {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              disabled={isBulkProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={isBulkProcessing}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  {statusFilter === 'draft' ? 'Submit Selected' : 'Approve Selected'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead
              className="text-white uppercase text-xs font-semibold"
              style={{
                backgroundColor: 'var(--table-header-bg)',
                ['--table-header-bg' as any]: headerColor,
              }}
            >
              <style>{`
                @media (prefers-color-scheme: dark) {
                  .dark thead[style*="--table-header-bg"] {
                    --table-header-bg: ${headerColorDark} !important;
                  }
                }
              `}</style>
              <tr>
                <th className="px-6 py-4 w-12">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap">TDN / Ref Ref</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Submitted By</th>
                <th className="px-6 py-4">Date Submitted</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 ml-auto bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="h-12 w-12 text-slate-300" />
                      <p>No pending approvals found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const innerData = record.data || {};
                  const isSelected = selectedIds.has(record.id);
                  return (
                    <tr 
                      key={record.id}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
                      <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          {record.tdn || innerData.tdn || innerData.TDN || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        {innerData.owner || innerData.owner_name || 'Unknown Owner'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          {record.createdBy || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          statusFilter === 'pending-municipal'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : statusFilter === 'pending-provincial'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}>
                          {statusFilter === 'draft' ? <FileEdit size={12} /> : <Clock size={12} />}
                          {statusFilter === 'pending-municipal' ? 'Municipal Review' : 
                           statusFilter === 'pending-provincial' ? 'Provincial Review' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleReview(record.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm ${
                            statusFilter !== 'draft'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {statusFilter !== 'draft' ? 'Review' : 'Open'}
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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

export default PendingApprovals;
