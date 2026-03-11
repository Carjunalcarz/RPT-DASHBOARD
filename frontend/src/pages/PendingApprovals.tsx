import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { listFaasRecords } from '@/services/faasService';
import { useThemeColor } from '@/context/ThemeColorContext';
import { FileText, User, Calendar, ArrowRight, CheckCircle, Clock, FileEdit } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

const PendingApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { headerColor, headerColorDark } = useThemeColor();
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<'pending-municipal' | 'pending-provincial' | 'draft'>('pending-municipal');

  // Fetch records based on selected status
  const { data, error, isLoading } = useSWR(
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
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, limit: newSize }));
  };

  const handleReview = (id: string) => {
    navigate(`/property-approval/${id}`);
  };

  const records = data?.data || [];
  const totalRecords = data?.pagination?.total || 0;

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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="h-12 w-12 text-slate-300" />
                      <p>No pending approvals found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const innerData = record.data || {};
                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
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
