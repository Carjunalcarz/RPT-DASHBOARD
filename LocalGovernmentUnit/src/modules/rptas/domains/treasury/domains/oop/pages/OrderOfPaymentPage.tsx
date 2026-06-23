import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { getPropertyReport, getTaxBegYears, PropertyReport } from '@/modules/rptas/shared/services/reportsService';
import oopService from '@/services/oopService';
import payorService from '@/services/payorService';
import PayorPreviewModal from '@/modules/rptas/domains/treasury/domains/payors/components/PayorPreviewModal';
import type { OrderOfPayment as OopOrder } from '@/types/oop';
import type { Payor } from '@/types/payor';
import { getPaymentBadgeClassName, getPaymentRowClassName, isPaymentSelectionDisabled } from '@/utils/paymentStatusColors';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import {
  Calculator,
  CheckSquare,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/modules/rptas/ui/dialog';

type SelectedMap = Record<string, PropertyReport>;
type PaymentRowStatus = '' | 'Unpaid' | 'Pending' | 'Paid' | 'Failed';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);

const makeReferenceNo = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OP-${yyyy}${mm}${dd}-${rand}`;
};

const OrderOfPayment: React.FC = () => {
  const { headerColor } = useThemeColor();
  const { user } = useAuth();
  // The rptas AuthContext `user` is the shared API-key mock (`api@system.local`),
  // so use the host shell's auth store for the real logged-in identity.
  const authUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement | null>(null);

  const [taxBegYrOptions, setTaxBegYrOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    municipality: '',
    barangay: '',
    taxBegYr: new Date().getFullYear().toString(),
  });
  const [searchText, setSearchText] = useState('');

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PropertyReport[]>([]);

  const [selected, setSelected] = useState<SelectedMap>({});
  const selectedCount = Object.keys(selected).length;

  const [referenceNo, setReferenceNo] = useState<string>(() => makeReferenceNo());
  const [payerName, setPayerName] = useState('');
  const [payerMatches, setPayerMatches] = useState<Payor[]>([]);
  const [previewPayor, setPreviewPayor] = useState<Payor | null>(null);
  const [payorPreviewOpen, setPayorPreviewOpen] = useState(false);
  const [payerSearching, setPayerSearching] = useState(false);
  const [payerPickerOpen, setPayerPickerOpen] = useState(false);
  const payerSearchTimer = useRef<number | null>(null);
  const [preparedBy, setPreparedBy] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [taxRatePct, setTaxRatePct] = useState<number>(1);
  const [penaltyRatePct, setPenaltyRatePct] = useState<number>(0);
  const [feePerRecord, setFeePerRecord] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [rowStatusByAssessmentId, setRowStatusByAssessmentId] = useState<Record<string, PaymentRowStatus>>({});
  const [orderIdByAssessmentId, setOrderIdByAssessmentId] = useState<Record<string, string>>({});
  const [ordersById, setOrdersById] = useState<Record<string, OopOrder>>({});
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [treasuryPayingId, setTreasuryPayingId] = useState<string | null>(null);
  const [treasuryOrders, setTreasuryOrders] = useState<OopOrder[]>([]);
  const handlePrint = useReactToPrint({
    contentRef: printRef as React.RefObject<HTMLDivElement | null>,
    documentTitle: `Order-of-Payment-${referenceNo}`,
  });

  const isTreasurer = useMemo(() => String(user?.role || '').toLowerCase() === 'treasurer', [user?.role]);

  useEffect(() => {
    if (preparedBy) return;
    const name =
      authUser?.fullName || authUser?.username || user?.fullName || user?.name;
    if (name) setPreparedBy(name);
  }, [preparedBy, authUser?.fullName, authUser?.username, user?.fullName, user?.name]);

  useEffect(() => {
    const q = payerName.trim();
    if (payerSearchTimer.current) window.clearTimeout(payerSearchTimer.current);
    if (q.length < 2) {
      setPayerMatches([]);
      setPayerSearching(false);
      return;
    }
    payerSearchTimer.current = window.setTimeout(async () => {
      try {
        setPayerSearching(true);
        const res = await payorService.search(q, 8);
        setPayerMatches(res.data || []);
      } catch {
        setPayerMatches([]);
      } finally {
        setPayerSearching(false);
      }
    }, 250);
    return () => {
      if (payerSearchTimer.current) window.clearTimeout(payerSearchTimer.current);
    };
  }, [payerName]);

  useEffect(() => {
    // Apply a payor selected from the Payor Registry. Runs on mount (first
    // navigation) AND on the 'oop:selected-payor' event (when this tab is
    // already open/mounted, so its mount read won't re-run).
    const applySelectedPayor = () => {
      try {
        const raw = localStorage.getItem('oop_selected_payor');
        if (!raw) return;
        localStorage.removeItem('oop_selected_payor');
        const p = JSON.parse(raw);
        const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
        if (name) setPayerName(name);
      } catch (e) {
        // Ignore parsing errors
      }
    };
    applySelectedPayor();
    window.addEventListener('oop:selected-payor', applySelectedPayor);
    return () => window.removeEventListener('oop:selected-payor', applySelectedPayor);
  }, []);

  useEffect(() => {
    const init = async () => {
      const currentYear = new Date().getFullYear().toString();
      const initialFilters = { municipality: '', barangay: '', taxBegYr: currentYear };
      setFilters(initialFilters);
      try {
        const years = await getTaxBegYears();
        const merged = Array.from(new Set([currentYear, ...years].filter(Boolean)));
        setTaxBegYrOptions(merged);
      } catch {
        setTaxBegYrOptions([currentYear]);
      }
      await fetchData(1, initialFilters);
    };
    init();
  }, []);

  const fetchData = async (page = 1, nextFilters = filters) => {
    try {
      setLoading(true);
      const response = await getPropertyReport({ ...nextFilters, page, limit: meta.limit });
      setRecords(response.data);
      setMeta({
        ...response.meta,
        page: Math.max(1, Number(response.meta?.page || 1)),
        totalPages: Math.max(1, Number(response.meta?.totalPages || 0)),
      });
      setRowStatusByAssessmentId((prev) => {
        const next = { ...prev };
        response.data.forEach((r) => {
          const s = String(r.paymentStatus || '').toLowerCase();
          if (s === 'paid') next[r.assessmentId] = 'Paid';
          else if (s === 'pending') next[r.assessmentId] = 'Pending';
          else if (s === 'unpaid') next[r.assessmentId] = 'Unpaid';
          else if (!next[r.assessmentId]) next[r.assessmentId] = '';
        });
        return next;
      });
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to fetch property assessment records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = async () => {
    await fetchData(1, filters);
  };

  const handlePageChange = async (newPage: number) => {
    const maxPages = Math.max(1, meta.totalPages);
    if (newPage >= 1 && newPage <= maxPages) {
      await fetchData(newPage, filters);
    }
  };

  const visibleRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      return (
        r.ownerName?.toLowerCase().includes(q) ||
        r.tdn?.toLowerCase().includes(q) ||
        r.pin?.toLowerCase().includes(q) ||
        r.assessmentId?.toLowerCase().includes(q) ||
        r.municipality?.toLowerCase().includes(q) ||
        r.barangay?.toLowerCase().includes(q)
      );
    });
  }, [records, searchText]);

  const isSelected = (assessmentId: string) => !!selected[assessmentId];
  
  const isRowDisabled = (assessmentId: string) => {
    const status = rowStatusByAssessmentId[assessmentId] || '';
    return isPaymentSelectionDisabled(status);
  };

  const toggleSelect = (record: PropertyReport) => {
    if (isRowDisabled(record.assessmentId)) return;
    
    setSelected(prev => {
      const next = { ...prev };
      if (next[record.assessmentId]) {
        delete next[record.assessmentId];
      } else {
        next[record.assessmentId] = record;
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected(prev => {
      const next = { ...prev };
      const selectableRecords = visibleRecords.filter(r => !isRowDisabled(r.assessmentId));
      
      if (selectableRecords.length === 0) return prev;
      
      const allSelected = selectableRecords.every(r => !!next[r.assessmentId]);
      if (allSelected) {
        selectableRecords.forEach(r => {
          delete next[r.assessmentId];
        });
      } else {
        selectableRecords.forEach(r => {
          next[r.assessmentId] = r;
        });
      }
      return next;
    });
  };

  const clearSelection = () => setSelected({});

  const selectedRecords = useMemo(() => Object.values(selected), [selected]);

  const computedRows = useMemo(() => {
    const taxRate = Math.max(0, Number.isFinite(taxRatePct) ? taxRatePct : 0);
    const penaltyRate = Math.max(0, Number.isFinite(penaltyRatePct) ? penaltyRatePct : 0);
    const fee = Math.max(0, Number.isFinite(feePerRecord) ? feePerRecord : 0);

    const rows = selectedRecords.map(r => {
      const basicTax = (r.assValue || 0) * (taxRate / 100);
      const penalty = basicTax * (penaltyRate / 100);
      const fees = fee;
      const total = basicTax + penalty + fees;
      return { record: r, basicTax, penalty, fees, total };
    });

    return rows;
  }, [selectedRecords, taxRatePct, penaltyRatePct, feePerRecord]);

  const totals = useMemo(() => {
    const subtotal = computedRows.reduce((acc, r) => acc + r.total, 0);
    const extraFees = Math.max(0, Number.isFinite(otherFees) ? otherFees : 0);
    const grandTotal = subtotal + extraFees;
    return {
      basicTax: computedRows.reduce((acc, r) => acc + r.basicTax, 0),
      penalty: computedRows.reduce((acc, r) => acc + r.penalty, 0),
      perRecordFees: computedRows.reduce((acc, r) => acc + r.fees, 0),
      otherFees: extraFees,
      grandTotal,
    };
  }, [computedRows, otherFees]);

  const canPrint = useMemo(() => {
    if (selectedCount === 0) return false;
    if (!payerName.trim()) return false;
    if (!paymentDate) return false;
    return true;
  }, [selectedCount, payerName, paymentDate]);

  const handleGenerateReference = () => setReferenceNo(makeReferenceNo());

  const validatePaymentDetails = () => {
    if (selectedCount === 0) {
      toast.error('Select at least one assessment record');
      return false;
    }
    if (!payerName.trim()) {
      toast.error('Payer name is required');
      return false;
    }
    if (!paymentDate) {
      toast.error('Payment date is required');
      return false;
    }
    return true;
  };

  const toRowStatus = (status: string | null | undefined): PaymentRowStatus => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid') return 'Paid';
    if (s === 'pending') return 'Pending';
    if (s === 'unpaid') return 'Unpaid';
    if (s === 'cancelled') return 'Failed';
    return '';
  };

  const refreshPaymentStatuses = async () => {
    if (refreshingStatus) return;
    const uniqueOrderIds = Array.from(new Set(Object.values(orderIdByAssessmentId))).filter(Boolean);
    if (uniqueOrderIds.length === 0) return;

    try {
      setRefreshingStatus(true);
      const results = await Promise.all(
        uniqueOrderIds.map(async (orderId) => {
          try {
            const res = await oopService.get(orderId);
            return { orderId, res };
          } catch (e: any) {
            return { orderId, error: e };
          }
        })
      );

      const nextOrders: Record<string, OopOrder> = {};
      results.forEach((r) => {
        if (r.res?.success && r.res.data) {
          nextOrders[r.orderId] = r.res.data;
        }
      });

      if (Object.keys(nextOrders).length > 0) {
        setOrdersById((prev) => ({ ...prev, ...nextOrders }));
        setRowStatusByAssessmentId((prev) => {
          const next = { ...prev };
          Object.entries(orderIdByAssessmentId).forEach(([assessmentId, orderId]) => {
            const order = nextOrders[orderId];
            if (!order) return;
            next[assessmentId] = toRowStatus(order.status);
          });
          return next;
        });
      }
    } finally {
      setRefreshingStatus(false);
    }
  };

  const fetchTreasuryPending = async () => {
    if (!isTreasurer) return;
    if (treasuryLoading) return;
    try {
      setTreasuryLoading(true);
      const res = await oopService.listPending({ page: 1, limit: 20 });
      if (res.success) {
        setTreasuryOrders(res.data);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load pending orders');
    } finally {
      setTreasuryLoading(false);
    }
  };

  useEffect(() => {
    if (!isTreasurer) return;
    fetchTreasuryPending();
  }, [isTreasurer]);

  const handleTreasuryConfirmPaid = async (order: OopOrder) => {
    if (!isTreasurer) return;
    if (treasuryPayingId) return;
    if (!window.confirm(`Confirm payment for ${order.orderNumber}?`)) return;
    try {
      setTreasuryPayingId(order.id);
      const approverName =
        authUser?.fullName || (user as any)?.fullName || (user as any)?.name || authUser?.username || undefined;
      const res = await oopService.markPaid(order.id, approverName);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to confirm payment');
        return;
      }
      toast.success('Payment confirmed');
      await fetchTreasuryPending();
      await fetchData(meta.page, filters);
      await refreshPaymentStatuses();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setTreasuryPayingId(null);
    }
  };

  useEffect(() => {
    const hasPending = Object.values(rowStatusByAssessmentId).some((s) => s === 'Pending');
    if (!hasPending) return;
    const id = window.setInterval(() => {
      refreshPaymentStatuses();
    }, 5000);
    return () => window.clearInterval(id);
  }, [orderIdByAssessmentId, rowStatusByAssessmentId]);

  const handleCreatePayment = async () => {
    if (creatingPayment) return;
    if (!validatePaymentDetails()) return;

    const selectedIds = selectedRecords.map((r) => r.assessmentId).filter(Boolean);
    if (selectedIds.length === 0) return;

    setCreatingPayment(true);
    setRowStatusByAssessmentId((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = 'Pending';
      });
      return next;
    });

    try {
      const payload = {
        amount: totals.grandTotal,
        description: `Order of Payment ${referenceNo} - ${payerName}`,
        referenceNo,
        payerName,
        preparedBy,
        paymentDate,
        filters,
        rates: {
          taxRatePct,
          penaltyRatePct,
          feePerRecord,
          otherFees,
        },
        totals,
        assessments: selectedRecords,
      };

      const res = await oopService.create(payload);
      if (!res.success || !res.data) {
        setRowStatusByAssessmentId((prev) => {
          const next = { ...prev };
          selectedIds.forEach((id) => {
            next[id] = 'Failed';
          });
          return next;
        });
        toast.error(res.message || 'Failed to create payment');
        return;
      }

      const order = res.data;
      setLatestOrderId(order.id);
      setOrdersById((prev) => ({ ...prev, [order.id]: order }));
      setOrderIdByAssessmentId((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = order.id;
        });
        return next;
      });
      setRowStatusByAssessmentId((prev) => {
        const next = { ...prev };
        const s = toRowStatus(order.status);
        selectedIds.forEach((id) => {
          next[id] = s || 'Pending';
        });
        return next;
      });
      toast.success(`Created payment ${order.orderNumber}`);
      await fetchData(meta.page, filters);
      await refreshPaymentStatuses();
    } catch (e: any) {
      setRowStatusByAssessmentId((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = 'Failed';
        });
        return next;
      });
      toast.error(e?.response?.data?.message || 'Failed to create payment');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleOpenPreview = () => {
    if (!validatePaymentDetails()) return;
    setPreviewOpen(true);
  };

  const handleConfirmCreateFromPreview = async () => {
    if (creatingPayment) return;
    await handleCreatePayment();
    setPreviewOpen(false);
  };

  return (
    <div data-testid="order-of-payment-page" className="space-y-6 p-6">
      <div
        className="px-6 py-4 rounded-lg shadow-sm bg-primary"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Order of Payment</h1>
            <p className="text-white/80 text-sm mt-1">Generate a printable payment order from assessment records</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fetchData(meta.page, filters)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => {
                if (!validatePaymentDetails()) return;
                handlePrint && handlePrint();
              }}
              disabled={!canPrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Order of Payment"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Municipality</label>
                  <input
                    name="municipality"
                    value={filters.municipality}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Municipality"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Barangay</label>
                  <input
                    name="barangay"
                    value={filters.barangay}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Barangay"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tax Beg Yr</label>
                  <select
                    name="taxBegYr"
                    value={filters.taxBegYr}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 h-[40px]"
                  >
                    <option value="">All years</option>
                    {taxBegYrOptions.map(yr => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-md flex items-center gap-2 transition-colors text-sm font-medium h-[40px]"
                >
                  <Filter size={16} />
                  Apply
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Search name, TDN, PIN, municipality..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Selected: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCount}</span>
                </div>
                <button
                  onClick={clearSelection}
                  disabled={selectedCount === 0}
                  className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  <X size={14} />
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="text-slate-500 hover:text-primary transition-colors"
                        aria-label="Select all on this page"
                      >
                        <CheckSquare size={16} />
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">TDN / PIN</th>
                    <th className="px-4 py-3 whitespace-nowrap">Owner</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Market Value</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Assessed Value</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Tax Beg Yr</th>
                    <th className="px-4 py-3 whitespace-nowrap">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          Loading assessment records...
                        </div>
                      </td>
                    </tr>
                  ) : visibleRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((r) => (
                      <tr
                        key={r.assessmentId}
                        className={`${getPaymentRowClassName(rowStatusByAssessmentId[r.assessmentId] || '')} ${
                          isRowDisabled(r.assessmentId) 
                            ? 'opacity-75 cursor-not-allowed' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected(r.assessmentId)}
                            onChange={() => toggleSelect(r)}
                            disabled={isRowDisabled(r.assessmentId)}
                            aria-disabled={isRowDisabled(r.assessmentId)}
                            className={`rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/50 ${
                              isRowDisabled(r.assessmentId) ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                            }`}
                            aria-label={`Select ${r.tdn || r.assessmentId}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {(() => {
                            const s = rowStatusByAssessmentId[r.assessmentId] || '';
                            const cls = getPaymentBadgeClassName(s);
                            return (
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-xs font-semibold ${cls}`}>
                                {s || '-'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-slate-900 dark:text-slate-100 font-medium">{r.tdn || 'N/A'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{r.pin || 'No PIN'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-slate-900 dark:text-slate-100" title={r.ownerName}>
                            {r.ownerName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{r.kind}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
                          {formatCurrency(r.marketValue || 0)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-primary dark:text-primary/80">
                          {formatCurrency(r.assValue || 0)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                          {r.taxBegYr}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          <div className="text-slate-700 dark:text-slate-200 text-sm">{r.municipality}</div>
                          <div>{r.barangay}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Page <span className="font-medium text-slate-900 dark:text-slate-100">{meta.page}</span> of{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{meta.totalPages}</span> • Total{' '}
                {meta.total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1 || loading}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages || loading}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator size={16} />
                Payment Details
              </h2>
              <button
                onClick={handleGenerateReference}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                New Ref
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reference No.</label>
                <input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Payer Name</label>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/rptas/treasury/payors', { state: { prefillQuery: payerName } })}
                    className="text-xs text-primary hover:text-primary-light font-semibold"
                  >
                    Search/Register
                  </button>
                </div>
                <div className="relative">
                  <input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    onFocus={() => setPayerPickerOpen(true)}
                    onBlur={() => window.setTimeout(() => setPayerPickerOpen(false), 120)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter payer name"
                  />
                  {payerPickerOpen && payerName.trim().length >= 2 ? (
                    <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg overflow-hidden">
                      {payerSearching ? (
                        <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">Searching…</div>
                      ) : payerMatches.length > 0 ? (
                        <div className="max-h-60 overflow-auto">
                          {payerMatches.map((p) => {
                            const label = `${p.firstName} ${p.lastName}`.trim();
                            const meta = [p.address, `${p.idType}: ${p.idNumber}`].filter(Boolean).join(' • ');
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setPreviewPayor(p);
                                  setPayorPreviewOpen(true);
                                  setPayerPickerOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              >
                                <div className="text-sm text-slate-900 dark:text-slate-100">{label}</div>
                                {meta ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{meta}</div> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">No payor found.</div>
                      )}
                      <div className="border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate('/dashboard/rptas/treasury/payors', { state: { prefillQuery: payerName } })}
                          className="w-full text-left px-3 py-2 text-xs text-primary-light dark:text-primary/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold"
                        >
                          Register new payor
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Prepared By</label>
                <input
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Officer / staff name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Rates & Fees</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Penalty (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={penaltyRatePct}
                  onChange={(e) => setPenaltyRatePct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fee / Record</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={feePerRecord}
                  onChange={(e) => setFeePerRecord(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Other Fees</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={otherFees}
                  onChange={(e) => setOtherFees(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Basic Tax</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totals.basicTax)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Penalty</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totals.penalty)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Per-record Fees</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totals.perRecordFees)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Other Fees</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totals.otherFees)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Total Due</span>
                <span className="font-bold text-primary dark:text-primary/80">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={handleOpenPreview}
                disabled={!canPrint || creatingPayment}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-md transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingPayment ? <Loader2 size={16} className="animate-spin" /> : null}
                Preview Payment
              </button>
              <button
                onClick={refreshPaymentStatuses}
                disabled={refreshingStatus || Object.keys(orderIdByAssessmentId).length === 0}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {refreshingStatus ? <Loader2 size={16} className="animate-spin" /> : null}
                Refresh Status
              </button>
              {latestOrderId && ordersById[latestOrderId] ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Order <span className="font-mono">{ordersById[latestOrderId].orderNumber}</span> •{' '}
                  <span className="font-semibold">{toRowStatus(ordersById[latestOrderId].status) || 'Pending'}</span>
                </div>
              ) : null}
            </div>
          </div>

          {isTreasurer ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Treasury Confirmation</h2>
                <button
                  onClick={fetchTreasuryPending}
                  disabled={treasuryLoading}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {treasuryLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Refresh
                </button>
              </div>

              {treasuryOrders.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No pending orders.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="text-left py-2">Order #</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {treasuryOrders.map((o) => (
                        <tr key={o.id} className="text-sm">
                          <td className="py-2 font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">{o.orderNumber}</td>
                          <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(o.amount))}
                          </td>
                          <td className="py-2 text-slate-700 dark:text-slate-200 max-w-[260px] truncate" title={o.description || ''}>
                            {o.description || '-'}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => handleTreasuryConfirmPaid(o)}
                              disabled={!!treasuryPayingId}
                              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {treasuryPayingId === o.id ? 'Confirming...' : 'Confirm Paid'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Order of Payment Preview</DialogTitle>
            <DialogDescription>Review the selected properties and totals before creating the payment.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-surface dark:bg-muted/20 p-4">
              <div className="text-xs text-muted dark:text-muted">Reference No</div>
              <div className="font-mono text-sm text-foreground dark:text-white">{referenceNo}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted dark:text-muted">Payment Date</div>
                  <div className="text-foreground dark:text-white">{paymentDate}</div>
                </div>
                <div>
                  <div className="text-xs text-muted dark:text-muted">Prepared By</div>
                  <div className="text-foreground dark:text-white">{preparedBy || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted dark:text-muted">Payer</div>
                  <div className="font-semibold text-foreground dark:text-white">{payerName}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface dark:bg-muted/20 p-4">
              <div className="text-sm font-semibold text-foreground dark:text-white">Totals</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted dark:text-muted">
                  <span>Records</span>
                  <span className="font-semibold text-foreground dark:text-white">{computedRows.length}</span>
                </div>
                <div className="flex justify-between text-muted dark:text-muted">
                  <span>Tax Rate</span>
                  <span className="font-semibold text-foreground dark:text-white">{Number(taxRatePct || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-muted dark:text-muted">
                  <span>Penalty Rate</span>
                  <span className="font-semibold text-foreground dark:text-white">{Number(penaltyRatePct || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-muted dark:text-muted">
                  <span>Fee / Record</span>
                  <span className="font-semibold text-foreground dark:text-white">{formatCurrency(Number(feePerRecord || 0))}</span>
                </div>
                <div className="flex justify-between text-muted dark:text-muted">
                  <span>Other Fees</span>
                  <span className="font-semibold text-foreground dark:text-white">{formatCurrency(totals.otherFees)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                  <span className="font-semibold text-foreground dark:text-white">Total Due</span>
                  <span className="font-bold text-primary dark:text-primary/80">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-primary text-surface sticky top-0">
                  <tr className="bg-primary text-surface">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">TDN</th>
                    <th className="px-3 py-2 text-left font-medium">PIN</th>
                    <th className="px-3 py-2 text-left font-medium">Owner</th>
                    <th className="px-3 py-2 text-left font-medium">Location</th>
                    <th className="px-3 py-2 text-center font-medium">Tax Beg Yr</th>
                    <th className="px-3 py-2 text-right font-medium">Assessed</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {computedRows.map(({ record, total }, idx) => (
                    <tr
                      key={record.assessmentId}
                      className={idx % 2 === 0 ? 'bg-surface dark:bg-surface' : 'bg-background dark:bg-background'}
                    >
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono">{record.tdn || 'N/A'}</td>
                      <td className="px-3 py-2 font-mono">{record.pin || '-'}</td>
                      <td className="px-3 py-2">{record.ownerName || '-'}</td>
                      <td className="px-3 py-2">{record.municipality} / {record.barangay}</td>
                      <td className="px-3 py-2 text-center font-mono">{record.taxBegYr || '-'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(record.assValue || 0)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handlePrint && handlePrint()}
              disabled={!canPrint}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print Preview
            </button>
            <button
              type="button"
              onClick={handleConfirmCreateFromPreview}
              disabled={creatingPayment}
              className="px-4 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-md transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creatingPayment ? <Loader2 size={16} className="animate-spin" /> : null}
              Confirm & Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="print-document" aria-hidden="true">
        <div id="print-document" ref={printRef}>
          <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
            {(() => {
              const order = latestOrderId ? ordersById[latestOrderId] : null;
              const orderNumber = order?.orderNumber || '';
              const orderStatus = String(order?.status || '').trim();
              return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Order of Payment</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  Reference No: <span style={{ fontFamily: 'monospace' }}>{referenceNo}</span>
                </div>
                {orderNumber ? (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    Order No: <span style={{ fontFamily: 'monospace' }}>{orderNumber}</span>
                    {orderStatus ? <span> • Status: {orderStatus}</span> : null}
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
                <div>Date: {paymentDate}</div>
                <div>Prepared By: {preparedBy || '-'}</div>
              </div>
            </div>
              );
            })()}

            <div style={{ marginTop: 16, fontSize: 12 }}>
              <div>
                <span style={{ color: '#475569' }}>Payer:</span> <span style={{ fontWeight: 600 }}>{payerName}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: '#475569' }}>Records:</span> <span style={{ fontWeight: 600 }}>{computedRows.length}</span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'left' }}>#</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'left' }}>TDN</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'left' }}>PIN</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'left' }}>Owner</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'left' }}>Location</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'center' }}>Tax Beg Yr</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'right' }}>Assessed Value</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'right' }}>Basic Tax</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'right' }}>Penalty</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'right' }}>Fees</th>
                    <th style={{ borderBottom: '1px solid #CBD5E1', padding: '8px 6px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {computedRows.map(({ record, basicTax, penalty, fees, total }, idx) => (
                    <tr key={record.assessmentId}>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px' }}>{idx + 1}</td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px' }}>{record.tdn || 'N/A'}</td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', fontFamily: 'monospace' }}>{record.pin || '-'}</td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px' }}>{record.ownerName}</td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px' }}>
                        {record.municipality} / {record.barangay}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {record.taxBegYr || '-'}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'right' }}>
                        {formatCurrency(record.assValue || 0)}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'right' }}>
                        {formatCurrency(basicTax)}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'right' }}>
                        {formatCurrency(penalty)}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'right' }}>
                        {formatCurrency(fees)}
                      </td>
                      <td style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 320, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Tax Rate</span>
                  <span style={{ fontWeight: 600 }}>{Number(taxRatePct || 0).toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Penalty Rate</span>
                  <span style={{ fontWeight: 600 }}>{Number(penaltyRatePct || 0).toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Fee / Record</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(Number(feePerRecord || 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Basic Tax</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totals.basicTax)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Penalty</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totals.penalty)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Per-record Fees</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totals.perRecordFees)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#475569' }}>Other Fees</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totals.otherFees)}</span>
                </div>
                <div style={{ borderTop: '1px solid #CBD5E1', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Total Due</span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PayorPreviewModal
        payor={previewPayor}
        open={payorPreviewOpen}
        onOpenChange={setPayorPreviewOpen}
        onConfirm={(p) => setPayerName(`${p.firstName} ${p.lastName}`.trim())}
      />
    </div>
  );
};

export default OrderOfPayment;
