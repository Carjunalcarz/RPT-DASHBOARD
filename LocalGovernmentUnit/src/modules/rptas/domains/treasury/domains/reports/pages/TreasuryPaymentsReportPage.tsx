import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  PaymentReceiptPrintSheet,
  RECEIPT_PRINT_PAGE_STYLE,
  type PaymentReceiptData,
} from '@/modules/rptas/domains/treasury/shared/components/PaymentReceipt';
import {
  AlertCircle, Filter, Loader2, RefreshCw, Download, Printer,
  LayoutGrid, List, Briefcase, FileText, Search, Menu, X, PieChart,
  CreditCard, MapPin, Building, ArrowUpDown, Landmark, Wallet, Banknote
} from 'lucide-react';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import {
  getTreasuryPaymentsReport,
  getCollectionSummary,
  listBankDeposits,
  createBankDeposit,
  TreasuryPaymentExportRow,
} from '@/modules/rptas/shared/services/reportsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/modules/rptas/ui/card';
import { Input } from '@/modules/rptas/ui/input';
import { Button } from '@/modules/rptas/ui/button';
import { Badge } from '@/modules/rptas/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/modules/rptas/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/rptas/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Label } from '@/modules/rptas/ui/label';
import { Textarea } from '@/modules/rptas/ui/textarea';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/modules/rptas/ui/checkbox';
import { Skeleton } from '@/modules/rptas/ui/skeleton';
import { format, subDays } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);

// Payor name is embedded in the order description as "... - <Payor>".
const extractPayorFromDescription = (desc?: string | null): string => {
  const parts = String(desc || '').split(' - ');
  return parts.length < 2 ? '' : parts.slice(1).join(' - ').trim();
};

// Map the stored payment-method code (from the Approve Payment dialog) to the
// human label printed on the receipt. Mirrors TreasuryConfirmPage's labels.
const paymentMethodLabel = (method?: string | null): string | null => {
  switch ((method || '').toLowerCase()) {
    case 'cash': return 'Cash (Over the Counter)';
    case 'check': return 'Check';
    case 'online': return 'Online Payment / Bank Transfer';
    default: return null;
  }
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const DepositStatusBadge: React.FC<{ status: 'on_treasury' | 'on_bank'; depositNumber?: string | null }> = ({ status, depositNumber }) => {
  if (status === 'on_bank') {
    return (
      <Badge className="font-medium shadow-none gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" title={depositNumber || undefined}>
        <Landmark className="h-3 w-3" /> Cash in Bank
      </Badge>
    );
  }
  return (
    <Badge className="font-medium shadow-none gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
      <Wallet className="h-3 w-3" /> Cash on Treasury
    </Badge>
  );
};

type Filters = {
  from: string;
  to: string;
  orderNumber: string;
  tdn: string;
  ownerName: string;
  municipalityCode: string;
  barangayCode: string;
  minAmount: string;
  maxAmount: string;
};

const emptyFilters: Filters = {
  from: '',
  to: '',
  orderNumber: '',
  tdn: '',
  ownerName: '',
  municipalityCode: '',
  barangayCode: '',
  minAmount: '',
  maxAmount: '',
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      active 
        ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary/80" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const TreasuryPaymentsReport: React.FC = () => {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<'exported' | 'daily' | 'bank'>('exported');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  const params = useMemo(() => {
    const trim = (s: string) => s.trim();
    const base: Record<string, string | number> = {
      page: pageIndex,
      limit: pageSize,
    };
    if (trim(applied.from)) base.from = trim(applied.from);
    if (trim(applied.to)) base.to = trim(applied.to);
    if (trim(applied.orderNumber)) base.orderNumber = trim(applied.orderNumber);
    if (trim(applied.tdn)) base.tdn = trim(applied.tdn);
    if (trim(applied.ownerName)) base.ownerName = trim(applied.ownerName);
    if (trim(applied.municipalityCode)) base.municipalityCode = trim(applied.municipalityCode);
    if (trim(applied.barangayCode)) base.barangayCode = trim(applied.barangayCode);
    if (trim(applied.minAmount)) base.minAmount = trim(applied.minAmount);
    if (trim(applied.maxAmount)) base.maxAmount = trim(applied.maxAmount);
    
    // Quick search can be applied to ownerName or orderNumber depending on the backend, 
    // here we just send it as a custom 'q' param if backend supports, or manually filter below.
    if (trim(globalSearch)) base.q = trim(globalSearch);

    return base;
  }, [applied, pageIndex, pageSize, globalSearch]);

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['treasury-report', params],
    queryFn: () => getTreasuryPaymentsReport(params as any),
    enabled: activeTab !== 'bank',
    placeholderData: keepPreviousData,
  });

  const summaryFilters = useMemo(
    () => ({ from: applied.from || undefined, to: applied.to || undefined }),
    [applied.from, applied.to]
  );
  const { data: summary } = useQuery({
    queryKey: ['treasury-collection-summary', summaryFilters],
    queryFn: () => getCollectionSummary(summaryFilters),
  });

  const depositsParams = useMemo(
    () => ({ from: applied.from || undefined, to: applied.to || undefined, page: pageIndex, limit: pageSize }),
    [applied.from, applied.to, pageIndex, pageSize]
  );
  const {
    data: depositsData,
    isLoading: depositsLoading,
    isFetching: depositsFetching,
    refetch: refetchDeposits,
  } = useQuery({
    queryKey: ['treasury-deposits', depositsParams],
    queryFn: () => listBankDeposits(depositsParams),
    enabled: activeTab === 'bank',
    placeholderData: keepPreviousData,
  });

  const errorMessage = error ? 'Failed to load treasury payments report.' : null;
  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: pageIndex, limit: pageSize, totalPages: 1 };
  const deposits = depositsData?.data || [];
  const depositsMeta = depositsData?.meta || { total: 0, page: pageIndex, limit: pageSize, totalPages: 1 };
  const isBankTab = activeTab === 'bank';
  const activeMeta = isBankTab ? depositsMeta : meta;
  const activeBusy = isBankTab ? depositsLoading || depositsFetching : isLoading || isFetching;

  // ----- Deposit to bank -----
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositDate, setDepositDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [depositRef, setDepositRef] = useState('');
  const [depositRemarks, setDepositRemarks] = useState('');

  const selectedRowObjects = rows.filter((r) => selectedRows.includes(r.id));
  const selectedOnTreasury = selectedRowObjects.filter((r) => r.depositStatus === 'on_treasury');
  const selectedHasDeposited = selectedRowObjects.some((r) => r.depositStatus === 'on_bank');
  // Deposits batch by distinct order (order_amount repeats across an order's rows).
  const depositOrders = useMemo(() => {
    const map = new Map<string, { orderId: string; amount: number }>();
    for (const r of selectedOnTreasury) {
      const key = r.orderId || r.orderNumber;
      if (!map.has(key)) map.set(key, { orderId: r.orderId, amount: Number(r.orderAmount || 0) });
    }
    return Array.from(map.values());
  }, [selectedOnTreasury]);
  const depositTotal = depositOrders.reduce((sum, o) => sum + o.amount, 0);

  const depositMutation = useMutation({
    mutationFn: () =>
      createBankDeposit({
        orderIds: depositOrders.map((o) => o.orderId),
        depositDate,
        referenceNo: depositRef.trim() || undefined,
        remarks: depositRemarks.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Deposited ${depositOrders.length} payment(s) — slip ${res.data?.depositNumber}`);
      setDepositOpen(false);
      setDepositRef('');
      setDepositRemarks('');
      setSelectedRows([]);
      refetch();
      refetchDeposits();
      queryClient.invalidateQueries({ queryKey: ['treasury-collection-summary'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || 'Failed to record deposit');
    },
  });

  const openDeposit = () => {
    if (depositOrders.length === 0) return;
    setDepositDate(format(new Date(), 'yyyy-MM-dd'));
    setDepositOpen(true);
  };

  // Clear stale selection when switching between tabs.
  useEffect(() => {
    setSelectedRows([]);
  }, [activeTab]);

  const applyFilters = () => {
    setApplied(draft);
    setPageIndex(1);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPageIndex(1);
    setGlobalSearch('');
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleAllRows = () => {
    if (selectedRows.length === rows.length && rows.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map(r => r.id));
    }
  };

  const handleExport = () => {
    if (selectedRows.length === 0) return;
    
    const exportData = rows
      .filter((r) => selectedRows.includes(r.id))
      .map((r) => ({
        'Order Number': r.orderNumber,
        'TDN': r.tdn || '',
        'PIN': r.pin || '',
        'Owner Name': r.ownerName || '',
        'Barangay': r.barangayName || r.barangayCode || '',
        'Municipality': r.municipalityName || r.municipalityCode || '',
        'Order Amount': r.orderAmount || 0,
        'Paid At': formatDateTime(r.paidAt),
        'Approved By': r.paidBy === '00000000-0000-0000-0000-000000000000' ? 'System API' : (r.paidByName || r.paidBy),
        'Status': (r.validationErrors || []).length > 0 ? 'Warnings' : 'Success',
      }));

    const headers = Object.keys(exportData[0]).join(',');
    const csvRows = exportData.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Treasury_Payments_Export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----- Receipt printing -----
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
  const printRef = useRef<HTMLDivElement>(null);
  const [printReceipts, setPrintReceipts] = useState<PaymentReceiptData[]>([]);
  const pendingPrint = useRef(false);

  const handleReceiptPrint = useReactToPrint({
    contentRef: printRef as React.RefObject<HTMLDivElement | null>,
    documentTitle: `Receipt-${new Date().getTime()}`,
    pageStyle: RECEIPT_PRINT_PAGE_STYLE,
  });

  // Print once the hidden sheet has rendered with the selected receipts.
  useEffect(() => {
    if (pendingPrint.current && printReceipts.length > 0) {
      pendingPrint.current = false;
      handleReceiptPrint();
    }
  }, [printReceipts, handleReceiptPrint]);

  const buildReceipts = (sourceRows: TreasuryPaymentExportRow[]): PaymentReceiptData[] => {
    // Group rows by order — one receipt per order, listing all its properties.
    const byOrder = new Map<string, TreasuryPaymentExportRow[]>();
    for (const r of sourceRows) {
      const key = r.orderId || r.orderNumber;
      if (!byOrder.has(key)) byOrder.set(key, []);
      byOrder.get(key)!.push(r);
    }

    const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean) as string[]));

    return Array.from(byOrder.values()).map((group) => {
      const first = group[0];
      const owners = uniq(group.map((g) => g.ownerName));
      const munis = uniq(group.map((g) => g.municipalityName || g.municipalityCode));
      const brgys = uniq(group.map((g) => g.barangayName || g.barangayCode));
      const taxYears = uniq(group.map((g) => g.taxBegYr));
      const paidDate = new Date(first.paidAt);

      return {
        orderNumber: first.orderNumber,
        referenceNo: first.orderNumber,
        // "Received From" = the payor (who paid), not the property owner.
        payerName:
          first.payerName ||
          extractPayorFromDescription(first.orderDescription) ||
          (owners.length === 1 ? owners[0] : owners.length > 1 ? 'Various Owners' : '-'),
        paymentDate: Number.isNaN(paidDate.getTime()) ? '-' : format(paidDate, 'yyyy-MM-dd'),
        preparedBy: first.preparedBy || '-',
        approvedAt: first.paidAt,
        approvedByName: first.approvedBy || (first.paidBy === SYSTEM_USER_ID ? 'System API' : first.paidByName) || 'Unknown',
        paymentMethodLabel: paymentMethodLabel(first.paymentMethod),
        coverage: [munis.join(', '), brgys.join(', ')].filter(Boolean).join(' / ') || '-',
        taxBegYr: taxYears.length === 1 ? taxYears[0] : taxYears.length > 1 ? 'Various' : '-',
        amountPaid: Number(first.orderAmount || 0),
        properties: group.map((g) => ({
          tdn: g.tdn,
          pin: g.pin,
          ownerName: g.ownerName,
          municipality: g.municipalityName || g.municipalityCode,
          barangay: g.barangayName || g.barangayCode,
          taxBegYr: g.taxBegYr,
          assValue: g.totalAssessedValue,
        })),
      };
    });
  };

  const printReceiptsFor = (sourceRows: TreasuryPaymentExportRow[]) => {
    const receipts = buildReceipts(sourceRows);
    if (receipts.length === 0) return;
    pendingPrint.current = true;
    setPrintReceipts(receipts);
  };

  const handlePrintReceipts = () => {
    printReceiptsFor(rows.filter((r) => selectedRows.includes(r.id)));
  };

  // Print a single order's receipt (all its property rows currently loaded).
  const handlePrintRow = (row: TreasuryPaymentExportRow) => {
    const key = row.orderId || row.orderNumber;
    printReceiptsFor(rows.filter((r) => (r.orderId || r.orderNumber) === key));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans" data-testid="treasury-payments-report-page">
      {/* Collapsible Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 shadow-sm",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-lg">
            <PieChart className="w-5 h-5 text-primary" />
            RPT Reports
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-124px)]">
          <div>
            <h4 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Treasury</h4>
            <div className="space-y-1">
              <SidebarItem 
                icon={<Briefcase className="w-4 h-4" />} 
                label="Exported Payments" 
                active={activeTab === 'exported'} 
                onClick={() => setActiveTab('exported')}
              />
              <SidebarItem 
                icon={<CreditCard className="w-4 h-4" />} 
                label="Daily Collections" 
                active={activeTab === 'daily'}
                onClick={() => {
                  setActiveTab('daily');
                  const today = format(new Date(), 'yyyy-MM-dd');
                  setDraft(prev => ({ ...prev, from: today, to: today }));
                  setApplied(prev => ({ ...prev, from: today, to: today }));
                  setPageIndex(1);
                  if (sidebarOpen) setSidebarOpen(false);
                }}
              />
              <SidebarItem 
                icon={<Building className="w-4 h-4" />} 
                label="Bank Deposits" 
                active={activeTab === 'bank'}
                onClick={() => {
                  setActiveTab('bank');
                  if (sidebarOpen) setSidebarOpen(false);
                }}
              />
            </div>
          </div>
          <div>
            <h4 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assessment</h4>
            <div className="space-y-1">
              <SidebarItem icon={<FileText className="w-4 h-4" />} label="FAAS Registry" />
              <SidebarItem icon={<MapPin className="w-4 h-4" />} label="Tax Declarations" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-3 sm:px-6 sm:py-3 h-auto sm:h-[60px] shadow-sm z-10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search report..." 
                className="pl-9 bg-slate-100 dark:bg-slate-800 border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/50" 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <Button 
              variant={showFilters ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setShowFilters(!showFilters)} 
              className={cn("gap-2 h-9", showFilters && "bg-primary/5 text-primary border-primary/20 dark:bg-primary/10 dark:border-primary/20")}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(applied.from || applied.to || applied.tdn || applied.orderNumber || applied.ownerName) && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 bg-primary text-white dark:text-white hover:bg-primary-light">!</Badge>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">{selectedRows.length} selected</span>
                <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleExport}><Download className="w-4 h-4"/> <span className="hidden sm:inline">Export</span></Button>
                <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handlePrintReceipts}><Printer className="w-4 h-4"/> <span className="hidden sm:inline">Print Receipt</span></Button>
                <Button
                  size="sm"
                  className="gap-2 h-9 bg-primary hover:bg-primary-light text-white dark:text-white"
                  onClick={openDeposit}
                  disabled={selectedOnTreasury.length === 0}
                  title={selectedOnTreasury.length === 0 ? 'Select payments that are still on treasury' : 'Deposit selected to bank'}
                >
                  <Landmark className="w-4 h-4" /> <span className="hidden sm:inline">Deposit to Bank</span>
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 border-l pl-3 ml-1 border-slate-200 dark:border-slate-700">
              <Button variant="ghost" size="icon" onClick={() => { if (isBankTab) refetchDeposits(); else refetch(); queryClient.invalidateQueries({ queryKey: ['treasury-collection-summary'] }); }} className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" title="Refresh">
                <RefreshCw className={cn("h-4 w-4", activeBusy && "animate-spin")} />
              </Button>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("px-2.5 h-8 rounded-sm", viewMode === 'table' && "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-primary/80")} 
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("px-2.5 h-8 rounded-sm", viewMode === 'card' && "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-primary/80")} 
                  onClick={() => setViewMode('card')}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Collection audit: Cash on Treasury vs Cash in Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-amber-200 shadow-sm dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">Cash on Treasury</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-0.5 truncate">{formatCurrency(summary?.onTreasuryAmount || 0)}</p>
                  <p className="text-[11px] text-slate-500">{summary?.onTreasuryCount || 0} payment(s) awaiting deposit</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 shadow-sm dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/80 dark:text-blue-400/80">Cash in Bank</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-0.5 truncate">{formatCurrency(summary?.onBankAmount || 0)}</p>
                  <p className="text-[11px] text-slate-500">{summary?.onBankCount || 0} payment(s) deposited</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Banknote className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Collected</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{formatCurrency((summary?.onTreasuryAmount || 0) + (summary?.onBankAmount || 0))}</p>
                  <p className="text-[11px] text-slate-500">{(summary?.onTreasuryCount || 0) + (summary?.onBankCount || 0)} payment(s) total</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeTab === 'daily' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Collections</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(rows.reduce((sum, r) => sum + (r.orderAmount || 0), 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Transactions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {meta.total}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Collection Date</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {applied.from === applied.to && applied.from ? format(new Date(applied.from), 'MMM dd, yyyy') : 'Multiple Days'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {activeTab === 'daily' ? 'Daily Collections' : activeTab === 'bank' ? 'Bank Deposits' : 'Exported Payments Report'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {activeTab === 'daily' 
                ? 'Review payments and collections recorded for specific dates.' 
                : activeTab === 'bank'
                ? 'Review records of deposits made to municipal bank accounts.'
                : 'View and manage payments marked as paid and exported for treasury reporting.'}
            </p>
          </div>

          {errorMessage ? (
            <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="border-slate-200 shadow-sm dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
              <CardContent className="pt-6">
                <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
                  {activeTab === 'daily' ? (
                    <div className="space-y-1.5 xl:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Collection Date</label>
                      <Input 
                        type="date" 
                        value={draft.from} 
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, from: e.target.value, to: e.target.value }));
                        }} 
                        className="h-9 w-full sm:w-1/2" 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date Range From</label>
                        <Input type="date" value={draft.from} onChange={(e) => setDraft((p) => ({ ...p, from: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date Range To</label>
                        <Input type="date" value={draft.to} onChange={(e) => setDraft((p) => ({ ...p, to: e.target.value }))} className="h-9" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Order Number</label>
                    <Input value={draft.orderNumber} onChange={(e) => setDraft((p) => ({ ...p, orderNumber: e.target.value }))} placeholder="e.g. OOP-2023..." className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">TDN</label>
                    <Input value={draft.tdn} onChange={(e) => setDraft((p) => ({ ...p, tdn: e.target.value }))} placeholder="e.g. 22-0001..." className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Owner Name</label>
                    <Input value={draft.ownerName} onChange={(e) => setDraft((p) => ({ ...p, ownerName: e.target.value }))} placeholder="Search by name" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Municipality</label>
                    <Input
                      value={draft.municipalityCode}
                      onChange={(e) => setDraft((p) => ({ ...p, municipalityCode: e.target.value }))}
                      placeholder="Code or Name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Barangay</label>
                    <Input
                      value={draft.barangayCode}
                      onChange={(e) => setDraft((p) => ({ ...p, barangayCode: e.target.value }))}
                      placeholder="Code or Name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Order Amount</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min (₱)"
                        type="number"
                        value={draft.minAmount}
                        onChange={(e) => setDraft((p) => ({ ...p, minAmount: e.target.value }))}
                        className="h-9"
                      />
                      <Input
                        placeholder="Max (₱)"
                        type="number"
                        value={draft.maxAmount}
                        onChange={(e) => setDraft((p) => ({ ...p, maxAmount: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-3 xl:col-start-4">
                    <Button onClick={applyFilters} className="gap-2 flex-1 h-9 bg-primary hover:bg-primary-light text-white dark:text-white">
                      <Filter className="h-4 w-4" />
                      Apply Filters
                    </Button>
                    <Button variant="outline" onClick={resetFilters} className="h-9">
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Presentation Area */}
          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">{isBankTab ? 'Deposit Slips' : 'Results'}</CardTitle>
                <CardDescription className="text-xs">
                  Showing {activeMeta.total > 0 ? Math.min((activeMeta.page - 1) * activeMeta.limit + 1, activeMeta.total) : 0} to {Math.min(activeMeta.page * activeMeta.limit, activeMeta.total)} of {activeMeta.total} records
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">

              {/* BANK DEPOSITS TAB */}
              {isBankTab && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px] w-full text-sm">
                    <TableHeader>
                      <TableRow className="hover:bg-primary border-none bg-primary">
                        <TableHead className="px-4 py-3 font-semibold text-white">DEPOSIT NO.</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">DEPOSIT DATE</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">REFERENCE</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-center">PAYMENTS</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-right">TOTAL AMOUNT</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">DEPOSITED BY</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">REMARKS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depositsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-slate-100 dark:border-slate-800/50">
                            {Array.from({ length: 7 }).map((__, j) => (
                              <TableCell key={j} className="px-4 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : deposits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Landmark className="h-8 w-8 text-slate-300 mb-1" />
                              <p className="font-medium text-slate-600 dark:text-slate-400">No bank deposits yet</p>
                              <p className="text-xs">Select paid payments on the Exported Payments tab and click “Deposit to Bank”.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        deposits.map((d) => (
                          <TableRow key={d.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <TableCell className="px-4 py-3 whitespace-nowrap font-mono text-xs font-medium text-slate-900 dark:text-slate-100">{d.depositNumber}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{format(new Date(d.depositDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{d.referenceNo || '-'}</TableCell>
                            <TableCell className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{d.paymentCount}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-right font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(d.totalAmount)}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{d.depositedByName || 'System API'}</TableCell>
                            <TableCell className="px-4 py-3 max-w-[220px] truncate text-slate-500" title={d.remarks || ''}>{d.remarks || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* TABLE VIEW */}
              {!isBankTab && viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1200px] w-full text-sm">
                    <TableHeader>
                      <TableRow className="hover:bg-primary border-none bg-primary">
                        <TableHead className="w-12 text-center px-4 py-3">
                          <Checkbox 
                            checked={selectedRows.length === rows.length && rows.length > 0}
                            onCheckedChange={toggleAllRows}
                            aria-label="Select all"
                            className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                          />
                        </TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors">
                            PAID AT <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">ORDER NO.</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">TDN / PIN</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">OWNER</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">APPROVED BY</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white">LOCATION</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-right">ORDER AMOUNT</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-center">DEPOSIT</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-center">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-slate-100 dark:border-slate-800/50">
                            <TableCell className="px-4 py-4 text-center"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                            <TableCell className="px-4 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="px-4 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell className="px-4 py-4">
                              <Skeleton className="h-4 w-28 mb-1" />
                              <Skeleton className="h-3 w-36" />
                            </TableCell>
                            <TableCell className="px-4 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell className="px-4 py-4">
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell className="px-4 py-4 text-center"><Skeleton className="h-5 w-24 mx-auto rounded-full" /></TableCell>
                            <TableCell className="px-4 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Search className="h-8 w-8 text-slate-300 mb-1" />
                              <p className="font-medium text-slate-600 dark:text-slate-400">No exported payments found</p>
                              <p className="text-xs">Try adjusting your filters or search query.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r) => {
                          const warnings = (r.validationErrors || []).length;
                          const isSelected = selectedRows.includes(r.id);
                          return (
                            <TableRow 
                              key={r.id} 
                              className={cn(
                                "border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 group cursor-default",
                                isSelected && "bg-primary/5 dark:bg-primary-light/10"
                              )}
                              onClick={() => toggleRowSelection(r.id)}
                            >
                              <TableCell className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRowSelection(r.id)}
                                  aria-label={`Select ${r.orderNumber}`}
                                />
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                {formatDateTime(r.paidAt)}
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                                {r.orderNumber}
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{r.tdn || '-'}</div>
                                <div className="text-xs text-slate-500 font-mono">{r.pin || '-'}</div>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                {r.ownerName || '-'}
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={r.paidByName || r.paidBy}>
                                  {r.paidBy === '00000000-0000-0000-0000-000000000000' ? 'System API' : (r.paidByName || 'Unknown')}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono" title={r.paidBy}>
                                  {r.paidBy === '00000000-0000-0000-0000-000000000000' ? '-' : (r.paidBy ? r.paidBy.substring(0, 8) + '...' : '-')}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap">
                                <div className="text-slate-900 dark:text-slate-100">{r.barangayName || r.barangayCode || '-'}</div>
                                <div className="text-xs text-slate-500">{r.municipalityName || r.municipalityCode || '-'}</div>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100">
                                {r.orderAmount !== null ? formatCurrency(r.orderAmount) : '-'}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                                <DepositStatusBadge status={r.depositStatus} depositNumber={r.depositNumber} />
                                {r.depositNumber ? (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.depositNumber}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Badge
                                    variant={warnings > 0 ? 'destructive' : 'default'}
                                    className={cn(
                                      "font-medium shadow-none",
                                      warnings === 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    )}
                                  >
                                    {warnings > 0 ? `${warnings} Warnings` : 'Success'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                                    title="Print receipt"
                                    onClick={(e) => { e.stopPropagation(); handlePrintRow(r); }}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* CARD VIEW */}
              {!isBankTab && viewMode === 'card' && (
                <div className="p-6">
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="border-slate-200 dark:border-slate-800 shadow-sm">
                          <CardHeader className="pb-2 space-y-2">
                            <div className="flex justify-between items-start">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-5 w-32" />
                          </CardHeader>
                          <CardContent className="space-y-3 pb-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                      <Search className="h-8 w-8 text-slate-300 mb-1" />
                      <p className="font-medium text-slate-600 dark:text-slate-400">No exported payments found</p>
                      <p className="text-xs">Try adjusting your filters or search query.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {rows.map((r) => {
                        const warnings = (r.validationErrors || []).length;
                        const isSelected = selectedRows.includes(r.id);
                        return (
                          <Card 
                            key={r.id} 
                            className={cn(
                              "border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md cursor-pointer group",
                              isSelected && "ring-2 ring-primary/50 border-transparent"
                            )}
                            onClick={() => toggleRowSelection(r.id)}
                          >
                            <CardHeader className="pb-2 px-4 pt-4">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox checked={isSelected} onCheckedChange={() => toggleRowSelection(r.id)} />
                                  </div>
                                  <span className="text-xs text-slate-500 font-medium">{formatDateTime(r.paidAt)}</span>
                                </div>
                                <Badge 
                                  variant={warnings > 0 ? 'destructive' : 'default'} 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 h-5 shadow-none",
                                    warnings === 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  )}
                                >
                                  {warnings > 0 ? `${warnings} Warn` : 'Success'}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-mono tracking-tight">{r.orderNumber}</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-3 text-sm">
                              <div>
                                <p className="text-xs text-slate-500 mb-0.5">Owner</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100 truncate" title={r.ownerName || ''}>{r.ownerName || '-'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-slate-500 mb-0.5">TDN</p>
                                  <p className="font-medium truncate" title={r.tdn || ''}>{r.tdn || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-0.5">Amount</p>
                                  <p className="font-semibold text-primary dark:text-primary/80">{r.orderAmount !== null ? formatCurrency(r.orderAmount) : '-'}</p>
                                </div>
                              </div>
                              <div className="pt-2 flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-500 truncate">
                                  <MapPin className="inline-block w-3 h-3 mr-1 -mt-0.5" />
                                  {[r.barangayName || r.barangayCode, r.municipalityName || r.municipalityCode].filter(Boolean).join(', ') || '-'}
                                </p>
                                <DepositStatusBadge status={r.depositStatus} depositNumber={r.depositNumber} />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="py-4 px-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="w-full">
                <DataTablePagination
                  pageIndex={activeMeta.page}
                  pageSize={activeMeta.limit}
                  totalCount={activeMeta.total}
                  totalPages={activeMeta.totalPages || 1}
                  setPageIndex={setPageIndex}
                  setPageSize={setPageSize}
                  isLoading={activeBusy}
                />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Deposit to Bank modal */}
      <Dialog open={depositOpen} onOpenChange={(open) => { if (!depositMutation.isPending) setDepositOpen(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Deposit to Bank
            </DialogTitle>
            <DialogDescription>
              Batch the selected collections into one deposit slip. These payments will move from
              <span className="font-medium text-amber-700"> Cash on Treasury</span> to
              <span className="font-medium text-blue-700"> Cash in Bank</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wide text-slate-500">Payments</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{depositOrders.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-semibold tracking-wide text-slate-500">Total to Deposit</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatCurrency(depositTotal)}</p>
              </div>
            </div>

            {selectedHasDeposited ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Note: some selected rows are already deposited and will be skipped.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deposit-date">Deposit Date</Label>
                <Input id="deposit-date" type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deposit-ref">Bank Reference / Slip No. <span className="text-slate-400">(optional)</span></Label>
                <Input id="deposit-ref" value={depositRef} onChange={(e) => setDepositRef(e.target.value)} placeholder="e.g. LBP-00231" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-remarks">Remarks <span className="text-slate-400">(optional)</span></Label>
              <Textarea id="deposit-remarks" value={depositRemarks} onChange={(e) => setDepositRemarks(e.target.value)} placeholder="Notes about this deposit" rows={2} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDepositOpen(false)} disabled={depositMutation.isPending}>Cancel</Button>
            <Button
              className="gap-2 bg-primary hover:bg-primary-light text-white dark:text-white"
              onClick={() => depositMutation.mutate()}
              disabled={depositMutation.isPending || depositOrders.length === 0}
            >
              {depositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
              Confirm Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden printable receipts (one A4 page per order, two copies each) */}
      <PaymentReceiptPrintSheet ref={printRef} receipts={printReceipts} />
    </div>
  );
};

export default TreasuryPaymentsReport;
