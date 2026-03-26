import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAlert } from '@/context/AlertContext';
import oopService from '@/services/oopService';
import type { OrderOfPayment } from '@/types/oop';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, CheckCircle2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const TreasuryConfirm: React.FC = () => {
  const { headerColor } = useThemeColor();
  const { user } = useAuth();
  const { showConfirm } = useAlert();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirmingRef = useRef<string | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['treasury-pending', page],
    queryFn: () => oopService.listPending({ page, limit: 20 }),
    enabled: !!user,
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 403) return false;
      return failureCount < 2;
    }
  });

  const permissionError = error && (error as any)?.response?.status === 403 
    ? (error as any)?.response?.data?.message || 'Permission denied' 
    : null;

  const canConfirm = !permissionError;

  const removeFromCache = (id: string) => {
    queryClient.setQueryData(['treasury-pending', page], (old: any) => {
      const current = old?.data;
      if (!Array.isArray(current)) return old;
      const next = current.filter((o: any) => o?.id !== id);
      const nextMeta = old?.meta
        ? { ...old.meta, total: Math.max(0, Number(old.meta.total || 0) - (current.length - next.length)) }
        : old?.meta;
      return { ...old, data: next, meta: nextMeta };
    });
  };

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => oopService.markPaid(id),
    onSuccess: (_res, id) => {
      toast.success('Payment confirmed');
      removeFromCache(id);
      queryClient.invalidateQueries({ queryKey: ['treasury-pending'] });
    },
    onError: (e: any, id) => {
      const msg = e?.response?.data?.message || 'Failed to confirm payment';
      const status = e?.response?.status;
      if (status === 400 && String(msg).toLowerCase().includes('only pending orders can be paid')) {
        toast.success('Already paid');
        removeFromCache(id);
        queryClient.invalidateQueries({ queryKey: ['treasury-pending'] });
        return;
      }
      toast.error(msg);
      queryClient.invalidateQueries({ queryKey: ['treasury-pending'] });
    }
  });

  const items = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => {
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        (o.createdBy || '').toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const handleMarkPaid = async (order: OrderOfPayment) => {
    if (markPaidMutation.isPending) return;
    if (!canConfirm) return;
    if (confirmingRef.current) return;
    confirmingRef.current = order.id;
    setConfirmingId(order.id);
    
    try {
      const isConfirmed = await showConfirm({
        title: 'Confirm Payment',
        message: `Are you sure you want to confirm payment for ${order.orderNumber}?`,
        confirmLabel: 'Confirm Paid',
        cancelLabel: 'Cancel'
      });
      
      if (!isConfirmed) return;
      markPaidMutation.mutate(order.id);
    } finally {
      confirmingRef.current = null;
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="px-6 py-4 rounded-lg shadow-sm" style={{ background: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)` }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Treasury</h1>
            <p className="text-blue-100 text-sm mt-1">Confirm payments and mark Orders of Payment as paid</p>
            {user?.role ? (
              <div className="text-blue-100/90 text-xs mt-2">
                Signed in as: <span className="font-semibold">{user.role}</span>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        {permissionError ? (
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20">
            {permissionError}
          </div>
        ) : null}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order number, description..."
              className="pl-9"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Pending: <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading pending orders...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    No pending orders.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(o.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[520px] truncate" title={o.description || ''}>
                      {o.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(o.dateCreated).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => handleMarkPaid(o)}
                        disabled={markPaidMutation.isPending || confirmingId === o.id || !canConfirm}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {markPaidMutation.isPending && markPaidMutation.variables === o.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Confirm Paid
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.page}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.totalPages || 1}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPage(p => p - 1)} disabled={isLoading || meta.page <= 1}>
              Prev
            </Button>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={isLoading || meta.page >= (meta.totalPages || 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryConfirm;
