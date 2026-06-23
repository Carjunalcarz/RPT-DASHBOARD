import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import oopService from '@/services/oopService';
import type { OrderOfPayment } from '@/types/oop';
import { toast } from 'sonner';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Loader2, RefreshCw, CheckCircle2, Search, FileText, User as UserIcon, DollarSign, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Label } from '@/modules/rptas/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/rptas/ui/select';

const TreasuryConfirm: React.FC = () => {
  const { headerColor } = useThemeColor();
  const { user } = useAuth();
  const authUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  
  // Review Modal State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderOfPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptApprovedAt, setReceiptApprovedAt] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OrderOfPayment | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement | null>(null);

  const selectedOrderId = selectedOrder?.id || null;

  const { data: historyData, isLoading: isHistoryLoading, error: historyError } = useQuery({
    queryKey: ['oop-history', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await oopService.getHistory(selectedOrderId);
      return res?.data || null;
    },
    enabled: !!user && !!selectedOrderId && (isReviewOpen || receiptOpen),
    retry: 1,
  });

  const createdSnapshot = useMemo(() => {
    const history = (historyData as any)?.history;
    if (!Array.isArray(history)) return null;
    const created = history.find((h: any) => h?.action === 'created') || history[history.length - 1];
    const requestBody = created?.payload?.requestBody || null;
    return requestBody;
  }, [historyData]);

  const createdAssessments = useMemo(() => {
    const rows = (createdSnapshot as any)?.assessments;
    if (!Array.isArray(rows)) return [];
    return rows;
  }, [createdSnapshot]);

  const receiptSnapshot = useMemo(() => {
    if (createdSnapshot) return createdSnapshot;
    return null;
  }, [createdSnapshot]);

  const receiptTotals = useMemo(() => {
    const t = (receiptSnapshot as any)?.totals;
    if (!t || typeof t !== 'object') return null;
    return t as any;
  }, [receiptSnapshot]);

  const receiptRates = useMemo(() => {
    const r = (receiptSnapshot as any)?.rates;
    if (!r || typeof r !== 'object') return null;
    return r as any;
  }, [receiptSnapshot]);

  const receiptPreparedBy = useMemo(() => {
    return (receiptSnapshot as any)?.preparedBy || null;
  }, [receiptSnapshot]);

  const receiptPaymentDate = useMemo(() => {
    return (receiptSnapshot as any)?.paymentDate || null;
  }, [receiptSnapshot]);

  const receiptFilters = useMemo(() => {
    const f = (receiptSnapshot as any)?.filters;
    if (!f || typeof f !== 'object') return null;
    return f as any;
  }, [receiptSnapshot]);

  // Tax Beg Yr for the header: prefer the order filter, else derive from the
  // included properties (which carry the actual tax beginning year).
  const receiptTaxBegYr = useMemo(() => {
    if (receiptFilters?.taxBegYr) return String(receiptFilters.taxBegYr);
    const years = Array.from(new Set((createdAssessments || []).map((a: any) => a.taxBegYr).filter(Boolean)));
    return years.length === 1 ? String(years[0]) : years.length > 1 ? 'Various' : '-';
  }, [receiptFilters, createdAssessments]);

  const receiptPayerName = useMemo(() => {
    return (receiptSnapshot as any)?.payerName || extractPayerFromDescription(receiptOrder?.description || '') || '-';
  }, [receiptSnapshot, receiptOrder?.description]);

  const receiptReferenceNo = useMemo(() => {
    return (receiptSnapshot as any)?.referenceNo || '-';
  }, [receiptSnapshot]);

  const receiptGrandTotal = useMemo(() => {
    const totalFromOrder = Number(receiptOrder?.amount || 0);
    const totalFromSnapshot = Number((receiptTotals as any)?.grandTotal || 0);
    return totalFromOrder || totalFromSnapshot || 0;
  }, [receiptOrder?.amount, receiptTotals]);

  const handleReceiptPrint = useReactToPrint({
    contentRef: receiptPrintRef as React.RefObject<HTMLDivElement | null>,
    documentTitle: `Receipt-${receiptOrder?.orderNumber || selectedOrder?.orderNumber || 'Payment'}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0.5in; }
      @media print {
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* Shrink slightly so BOTH copies fit one page even with the 0.5in margin */
        #print-document { zoom: 0.9; }
        #print-document, #print-document * { font-weight: 400 !important; }
        #print-document td, #print-document th { padding-top: 1px !important; padding-bottom: 1px !important; }
        #print-document .receipt-copy { break-inside: avoid; }
      }
    `,
  });

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

  // Prefer a real name from either auth source; fall back to the username last.
  // Real logged-in user only — never the shared API-key mock user (which would
  // print "api" as the approver).
  const defaultApprover =
    authUser?.fullName || authUser?.username || '';
  const [approvedByInput, setApprovedByInput] = useState('');

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => oopService.markPaid(id, approvedByInput.trim() || undefined, paymentMethod),
    onSuccess: (res, id) => {
      toast.success('Payment successfully approved');
      queryClient.invalidateQueries({ queryKey: ['treasury-pending'] });
      const approvedAt = new Date().toISOString();
      const paidOrder = (res as any)?.data || null;
      setReceiptApprovedAt(approvedAt);
      setReceiptOrder(paidOrder || selectedOrder);
      setIsReviewOpen(false); // close the Approve Payment modal now that it's paid
      setReceiptOpen(true);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Failed to approve payment';
      toast.error(msg);
    }
  });

  const items = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o: any) => {
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        (o.createdBy || '').toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  function extractPayerFromDescription(desc: string) {
    const parts = String(desc || '').split(' - ');
    if (parts.length < 2) return '';
    return parts.slice(1).join(' - ').trim();
  }

  const handleReview = (order: OrderOfPayment) => {
    if (!canConfirm) return;
    setSelectedOrder(order);
    setApprovedByInput(defaultApprover);
    setIsReviewOpen(true);
  };

  const handleConfirmApproval = () => {
    if (!selectedOrder) return;
    markPaidMutation.mutate(selectedOrder.id);
  };

  const formatMoney = (value: any) => {
    const n = Number(value || 0);
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n);
  };

  const formatLocalDateTime = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  };

  const renderReceipt = (isPrint: boolean, copyLabel?: string) => {
    const col3 = isPrint ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3';
    const col2 = isPrint ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2';
    const span2 = isPrint ? 'col-span-2' : 'sm:col-span-2';
    const tableScroll = isPrint ? '' : 'max-h-72 overflow-auto';

    // Paper (print) renders as a clean black-on-white document; the on-screen
    // version keeps the colored header band and emerald accents.
    const s = {
      card: isPrint
        ? 'bg-white text-slate-900'
        : 'bg-white text-slate-900 rounded-xl border border-slate-200 overflow-hidden shadow-sm',
      header: isPrint
        ? 'px-4 pb-1.5 mb-0.5 border-b border-slate-300 text-slate-900'
        : 'bg-primary text-white px-6 py-5',
      headerRow: isPrint ? 'flex items-center justify-between gap-4' : 'flex items-start justify-between gap-6',
      headerMuted: isPrint ? 'text-slate-600' : 'text-white/80',
      seal: isPrint
        ? 'h-12 w-12 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0'
        : 'h-14 w-14 rounded-full overflow-hidden ring-2 ring-white/70 bg-white flex items-center justify-center shrink-0',
      brand: isPrint ? 'text-xs font-bold' : 'text-base font-bold',
      paidBadge: isPrint
        ? 'mt-1 inline-flex items-center gap-1 rounded-full border border-slate-800 px-2 py-0 text-[9px] font-bold uppercase tracking-wide text-slate-900'
        : 'mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 ring-1 ring-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-50',
      paidDot: isPrint ? 'bg-slate-800' : 'bg-emerald-300',
      detailCard: isPrint ? 'rounded-md border border-slate-300 p-2' : 'rounded-lg border border-slate-200 bg-slate-50/60 p-4',
      detailGapY: isPrint ? 'gap-y-1' : 'gap-y-3',
      amountCard: isPrint ? 'rounded-md border border-slate-300 p-2 flex flex-col' : 'rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex flex-col',
      amountLabel: isPrint ? 'text-slate-500' : 'text-emerald-700',
      amountValue: isPrint ? 'text-slate-900' : 'text-emerald-700',
      amountSize: isPrint ? 'text-lg' : 'text-2xl',
      amountSubLabel: isPrint ? 'text-slate-500' : 'text-emerald-700/80',
      amountSubVal: isPrint ? 'text-slate-900' : 'text-emerald-900',
      box: isPrint ? 'rounded-md border border-slate-300 p-2' : 'rounded-lg border border-slate-200 p-4',
      rowSpace: isPrint ? 'mt-1 space-y-0.5 text-[11px]' : 'mt-2 space-y-1.5 text-xs',
      tableWrap: isPrint ? 'mt-2 rounded-md border border-slate-300 overflow-hidden' : 'mt-4 rounded-lg border border-slate-200 overflow-hidden',
      tableHead: isPrint ? 'px-3 py-1 flex items-center justify-between border-b border-slate-300' : 'bg-slate-100 px-4 py-2.5 flex items-center justify-between',
      thead: isPrint ? 'text-[9px] uppercase tracking-wide text-slate-600 border-b border-slate-300' : 'bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200',
      rowBorder: isPrint ? 'border-b border-slate-200' : 'border-b border-slate-100 even:bg-slate-50/50',
      tfoot: isPrint ? 'border-t-2 border-slate-400 font-semibold text-slate-900' : 'bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-800',
      totalPaid: isPrint ? 'font-black text-slate-900' : 'font-black text-emerald-700',
      footerDivider: isPrint ? 'border-slate-300' : 'border-slate-200',
      // Tighter spacing on paper so two copies fit on one A4 sheet.
      body: isPrint ? 'relative px-4 py-2' : 'relative px-6 py-5',
      sectionGrid: isPrint ? 'gap-2' : 'gap-3',
      sigGap: isPrint ? 'mt-3' : 'mt-8',
      sigColGap: isPrint ? 'gap-6' : 'gap-8',
      blockGap: isPrint ? 'mt-2' : 'mt-4',
      footGap: isPrint ? 'mt-2 pt-1.5' : 'mt-5 pt-3',
      cellY: isPrint ? 'py-1' : 'py-2',
    };

    const paymentMethodLabel =
      paymentMethod === 'cash'
        ? 'Cash (Over the Counter)'
        : paymentMethod === 'check'
          ? 'Check'
          : 'Online Payment / Bank Transfer';

    const totalAssessed = createdAssessments.reduce(
      (sum: number, r: any) => sum + Number(r.assValue || 0),
      0
    );

    const field = (label: string, value: React.ReactNode, mono = false) => (
      <div>
        <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">{label}</div>
        <div className={`text-xs text-slate-900 ${mono ? 'font-mono' : 'font-medium'}`}>{value || '-'}</div>
      </div>
    );

    const sumRow = (label: string, value: React.ReactNode) => (
      <div className="flex items-center justify-between">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
    );

    return (
      <div className={s.card}>
        {/* Header band */}
        <div className={s.header}>
          <div className={s.headerRow}>
            <div className="flex items-center gap-3">
              <div className={s.seal}>
                <img
                  src="/assessor-logo.png"
                  alt="Office of the Provincial Assessor"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent && !parent.dataset.fallback) {
                      parent.dataset.fallback = '1';
                      parent.textContent = 'LGU';
                      parent.classList.add('text-[10px]', 'font-bold', isPrint ? 'text-slate-900' : 'text-slate-700');
                    }
                  }}
                />
              </div>
              <div className="leading-tight">
                <div className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${s.headerMuted}`}>Republic of the Philippines</div>
                <div className={s.brand}>RPTAS Treasury</div>
                <div className={`text-[11px] ${s.headerMuted}`}>Official Payment Receipt</div>
              </div>
            </div>
            <div className="text-right">
              {copyLabel ? (
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-500">{copyLabel}</div>
              ) : null}
              <div className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${s.headerMuted}`}>Official Receipt No</div>
              <div className="font-mono text-lg font-bold tracking-wide">{receiptOrder?.orderNumber || selectedOrder?.orderNumber || '-'}</div>
              <div className={s.paidBadge}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.paidDot}`} /> Paid
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={s.body}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-[72px] font-black tracking-[0.25em] text-slate-900/[0.04] -rotate-12">OFFICIAL</div>
          </div>

          <div className="relative">
            {/* Party details + amount hero */}
            <div className={`grid ${col3} ${s.sectionGrid}`}>
              <div className={`${span2} ${s.detailCard}`}>
                <div className={`grid grid-cols-2 gap-x-4 ${s.detailGapY}`}>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Received From</div>
                    <div className="text-base font-bold text-slate-900">{receiptPayerName}</div>
                  </div>
                  {field('Reference No', receiptReferenceNo, true)}
                  {field('Payment Date', receiptPaymentDate || '-')}
                  {field('Prepared By', receiptPreparedBy || '-')}
                  {field('Coverage', [receiptFilters?.municipality, receiptFilters?.barangay].filter(Boolean).join(' / ') || '-')}
                  {field('Tax Beg Yr', receiptTaxBegYr, true)}
                </div>
              </div>

              <div className={s.amountCard}>
                <div className={`text-[10px] uppercase font-bold tracking-wide ${s.amountLabel}`}>Amount Paid</div>
                <div className={`mt-1 ${s.amountSize} font-black leading-none ${s.amountValue}`}>{formatMoney(receiptGrandTotal)}</div>
                <div className={`mt-3 text-[10px] uppercase font-bold tracking-wide ${s.amountSubLabel}`}>Payment Method</div>
                <div className={`text-xs font-semibold ${s.amountSubVal}`}>{paymentMethodLabel}</div>
                <div className={`mt-auto pt-3 text-[10px] ${s.amountSubLabel}`}>Approved {formatLocalDateTime(receiptApprovedAt)}</div>
              </div>
            </div>

            {/* Properties table */}
            <div className={s.tableWrap}>
              <div className={s.tableHead}>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Included Properties ({createdAssessments.length})</span>
                {receiptRates ? (
                  <span className="text-[10px] font-medium text-slate-500">
                    Tax {Number(receiptRates.taxRatePct || 0)}% • Penalty {Number(receiptRates.penaltyRatePct || 0)}% • Fee/Record {formatMoney(receiptRates.feePerRecord || 0)}
                  </span>
                ) : null}
              </div>
              <div className={tableScroll}>
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className={s.thead}>
                      <th className="px-3 py-2 text-left w-[28px]">#</th>
                      <th className="px-3 py-2 text-left">TDN</th>
                      <th className="px-3 py-2 text-left">PIN</th>
                      <th className="px-3 py-2 text-left">Owner</th>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Tax Beg Yr</th>
                      <th className="px-3 py-2 text-right">Assessed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdAssessments.map((r: any, idx: number) => (
                      <tr key={`${r.assessmentId || r.propertyId || idx}`} className={s.rowBorder}>
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap">{r.tdn || '-'}</td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-600">{r.pin || '-'}</td>
                        <td className="px-3 py-2 font-medium">{r.ownerName || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{[r.municipality, r.barangay].filter(Boolean).join(' / ') || '-'}</td>
                        <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{r.taxBegYr || '-'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatMoney(r.assValue || 0)}</td>
                      </tr>
                    ))}
                    {createdAssessments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          No property records found for this receipt.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {createdAssessments.length > 0 ? (
                    <tfoot>
                      <tr className={s.tfoot}>
                        <td colSpan={6} className="px-3 py-2 text-right text-[10px] uppercase tracking-wide">Total Assessed Value</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatMoney(totalAssessed)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>

            {/* Approval + breakdown */}
            <div className={`${s.blockGap} grid ${col2} ${s.sectionGrid}`}>
              <div className={s.box}>
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Approval</div>
                <div className={s.rowSpace}>
                  {sumRow('Approved At', formatLocalDateTime(receiptApprovedAt))}
                  {sumRow('Approved By', approvedByInput || defaultApprover || authUser?.fullName || authUser?.username || '-')}
                  {sumRow('Payment Method', paymentMethodLabel)}
                </div>
              </div>

              <div className={s.box}>
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Amount Breakdown</div>
                <div className={s.rowSpace}>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Total Paid</span>
                    <span className={s.totalPaid}>{formatMoney(receiptGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className={`${s.sigGap} grid ${col2} ${s.sigColGap} text-xs`}>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-2 font-semibold text-slate-900">Treasury Officer</div>
                <div className="text-[10px] text-slate-500">Signature over printed name</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-2 font-semibold text-slate-900">Client / Payor</div>
                <div className="text-[10px] text-slate-500">Signature over printed name</div>
              </div>
            </div>

            {/* Footer */}
            <div className={`${s.footGap} border-t border-dashed ${s.footerDivider} text-[10px] text-slate-500 flex items-center justify-between`}>
              <span>This is a system-generated receipt. No signature required unless requested.</span>
              <span className="font-mono">Ref: {receiptReferenceNo}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="px-6 py-4 rounded-lg shadow-sm bg-primary">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Payment Approval</h1>
            <p className="text-white/80 text-sm mt-1">Review and approve pending payment orders</p>
            {user?.role ? (
              <div className="text-white/90 text-xs mt-2">
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
            Pending Approvals: <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Customer / Details</th>
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
                    No pending orders for approval.
                  </td>
                </tr>
              ) : (
                filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary dark:text-primary/80 whitespace-nowrap">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(o.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[400px] truncate" title={o.description || ''}>
                      <div className="flex flex-col">
                        <span className="truncate">{extractPayerFromDescription(o.description) || o.description || '-'}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(Array.isArray(o.propertyIds) ? o.propertyIds.length : 0) ? `${o.propertyIds.length} property record(s)` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(o.dateCreated).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => handleReview(o)}
                        disabled={!canConfirm}
                        variant="outline"
                        className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                      >
                        <FileText className="h-4 w-4" />
                        Review & Approve
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

      {/* Review & Approve Modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[820px] md:max-w-[960px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Approve Payment
            </DialogTitle>
            <DialogDescription>
              Review the comprehensive payment details before final approval. This action will mark the order as paid and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5"><FileText className="w-3 h-3"/> Order Number</p>
                  <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{selectedOrder.orderNumber}</p>
                </div>
                <div className="space-y-1 bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <p className="text-xs text-primary/70 font-semibold uppercase flex items-center gap-1.5"><DollarSign className="w-3 h-3"/> Payment Amount</p>
                  <p className="font-semibold text-lg text-primary">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(selectedOrder.amount))}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5"><UserIcon className="w-3 h-3"/> Customer Details / Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-normal break-words max-w-full">
                    {selectedOrder.description || 'No customer details provided.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Created Order Information</p>
                  {isHistoryLoading ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading order details...
                    </div>
                  ) : historyError ? (
                    <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-md p-2">
                      Failed to load created order details.
                    </div>
                  ) : createdSnapshot ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="grid grid-cols-2 gap-0 text-xs">
                        <div className="p-3 border-b border-r border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400">Reference No</div>
                          <div className="font-mono text-slate-900 dark:text-slate-100">{(createdSnapshot as any).referenceNo || '-'}</div>
                        </div>
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400">Payer</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{(createdSnapshot as any).payerName || extractPayerFromDescription(selectedOrder.description || '') || '-'}</div>
                        </div>
                        <div className="p-3 border-r border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400">Prepared By</div>
                          <div className="text-slate-900 dark:text-slate-100">{(createdSnapshot as any).preparedBy || '-'}</div>
                        </div>
                        <div className="p-3">
                          <div className="text-slate-500 dark:text-slate-400">Payment Date</div>
                          <div className="text-slate-900 dark:text-slate-100">{(createdSnapshot as any).paymentDate || '-'}</div>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-800">
                        <div className="p-3 text-xs text-slate-500 dark:text-slate-400">
                          Included records: <span className="font-semibold text-slate-900 dark:text-slate-100">{createdAssessments.length}</span>
                        </div>
                        <div className="max-h-56 overflow-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-left">TDN</th>
                                <th className="px-3 py-2 text-left">PIN</th>
                                <th className="px-3 py-2 text-left">Owner</th>
                                <th className="px-3 py-2 text-right">Assessed</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {createdAssessments.map((r: any, idx: number) => (
                                <tr key={`${r.assessmentId || r.propertyId || idx}`}>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">{r.tdn || '-'}</td>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">{r.pin || '-'}</td>
                                  <td className="px-3 py-2 max-w-[220px] truncate" title={r.ownerName || ''}>{r.ownerName || '-'}</td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(r.assValue || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No created order details found.
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5"><CreditCard className="w-3 h-3"/> Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash (Over the Counter)</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="online">Online Payment / Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5"><UserIcon className="w-3 h-3"/> Approved By</Label>
                  <Input
                    value={approvedByInput}
                    onChange={(e) => setApprovedByInput(e.target.value)}
                    placeholder="Name of approving officer"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)} disabled={markPaidMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmApproval} 
              disabled={markPaidMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {markPaidMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                'Approve Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={receiptOpen}
        onOpenChange={(open) => {
          setReceiptOpen(open);
          if (!open) {
            setIsReviewOpen(false);
            setSelectedOrder(null);
            setReceiptOrder(null);
            setReceiptApprovedAt(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[820px] md:max-w-[960px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Provide this receipt to the client after payment approval.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {renderReceipt(false)}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              Close
            </Button>
            <Button onClick={() => handleReceiptPrint && handleReceiptPrint()} className="gap-2">
              <FileText className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="print-document" aria-hidden="true">
        <div id="print-document" ref={receiptPrintRef} className="bg-white text-slate-900">
          {/* Two copies on one A4 sheet: Client (top) and Assessor (bottom) */}
          <div className="receipt-copy px-3 pt-2">{renderReceipt(true, "Client's Copy")}</div>
          <div className="my-1.5 px-3">
            <div className="border-t border-dashed border-slate-400" />
            <div className="-mt-1.5 flex justify-center">
              <span className="bg-white px-2 text-[8px] uppercase tracking-[0.3em] text-slate-400">✂ Cut here — Assessor's Copy below</span>
            </div>
          </div>
          <div className="receipt-copy px-3 pb-2">{renderReceipt(true, "Assessor's Copy")}</div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryConfirm;
