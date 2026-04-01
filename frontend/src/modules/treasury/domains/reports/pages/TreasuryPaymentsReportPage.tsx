import React, { useMemo, useState } from 'react';
import { 
  AlertCircle, Filter, Loader2, RefreshCw, Download, Printer, 
  LayoutGrid, List, Briefcase, FileText, Search, Menu, X, PieChart,
  CreditCard, MapPin, Building, ArrowUpDown
} from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { getTreasuryPaymentsReport, TreasuryPaymentExportRow } from '@/modules/rptas/shared/services/reportsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useThemeColor } from '@/context/ThemeColorContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);

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

type Filters = {
  from: string;
  to: string;
  orderNumber: string;
  tdn: string;
  ownerName: string;
  municipalityCode: string;
  barangayCode: string;
};

const emptyFilters: Filters = {
  from: '',
  to: '',
  orderNumber: '',
  tdn: '',
  ownerName: '',
  municipalityCode: '',
  barangayCode: '',
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      active 
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const TreasuryPaymentsReport: React.FC = () => {
  const { headerColor: themeHeaderColor } = useThemeColor();
  // Ensure we get a valid hex color string for inline styles
  const headerColor = typeof themeHeaderColor === 'string' && themeHeaderColor.startsWith('#') ? themeHeaderColor : '#108A9E'; 
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
    
    // Quick search can be applied to ownerName or orderNumber depending on the backend, 
    // here we just send it as a custom 'q' param if backend supports, or manually filter below.
    if (trim(globalSearch)) base.q = trim(globalSearch);

    return base;
  }, [applied, pageIndex, pageSize, globalSearch]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['treasury-report', params],
    queryFn: () => getTreasuryPaymentsReport(params as any),
  });

  const errorMessage = error ? 'Failed to load treasury payments report.' : null;
  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: pageIndex, limit: pageSize, totalPages: 1 };

  const applyFilters = () => {
    setApplied(draft);
    setPageIndex(1);
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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans" data-testid="treasury-payments-report-page">
      {/* Collapsible Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 shadow-sm",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-lg">
            <PieChart className="w-5 h-5 text-blue-600" />
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
              <SidebarItem icon={<Briefcase className="w-4 h-4" />} label="Exported Payments" active />
              <SidebarItem icon={<CreditCard className="w-4 h-4" />} label="Daily Collections" />
              <SidebarItem icon={<Building className="w-4 h-4" />} label="Bank Deposits" />
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
                className="pl-9 bg-slate-100 dark:bg-slate-800 border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500" 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <Button 
              variant={showFilters ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setShowFilters(!showFilters)} 
              className={cn("gap-2 h-9", showFilters && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800")}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(applied.from || applied.to || applied.tdn || applied.orderNumber || applied.ownerName) && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 bg-blue-600 text-white hover:bg-blue-700">!</Badge>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">{selectedRows.length} selected</span>
                <Button variant="outline" size="sm" className="gap-2 h-9"><Download className="w-4 h-4"/> <span className="hidden sm:inline">Export</span></Button>
                <Button variant="outline" size="sm" className="gap-2 h-9"><Printer className="w-4 h-4"/> <span className="hidden sm:inline">Print</span></Button>
              </div>
            )}
            <div className="flex items-center gap-2 border-l pl-3 ml-1 border-slate-200 dark:border-slate-700">
              <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" title="Refresh">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("px-2.5 h-8 rounded-sm", viewMode === 'table' && "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400")} 
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("px-2.5 h-8 rounded-sm", viewMode === 'card' && "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400")} 
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
          
          {/* Header Section */}
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Exported Payments Report</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">View and manage payments marked as paid and exported for treasury reporting.</p>
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date Range From</label>
                    <Input type="date" value={draft.from} onChange={(e) => setDraft((p) => ({ ...p, from: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date Range To</label>
                    <Input type="date" value={draft.to} onChange={(e) => setDraft((p) => ({ ...p, to: e.target.value }))} className="h-9" />
                  </div>
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
                  <div className="flex items-end gap-3 xl:col-start-4">
                    <Button onClick={applyFilters} className="gap-2 flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white">
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
                <CardTitle className="text-base font-semibold">Results</CardTitle>
                <CardDescription className="text-xs">
                  Showing {meta.total > 0 ? Math.min((meta.page - 1) * meta.limit + 1, meta.total) : 0} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              
              {/* TABLE VIEW */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1200px] w-full text-sm">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-none" style={{ backgroundColor: headerColor }}>
                        <TableHead className="w-12 text-center px-4 py-3">
                          <Checkbox 
                            checked={selectedRows.length === rows.length && rows.length > 0}
                            onCheckedChange={toggleAllRows}
                            aria-label="Select all"
                            className="border-white/50 data-[state=checked]:bg-white"
                            style={selectedRows.length === rows.length && rows.length > 0 ? { color: headerColor } : {}}
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
                        <TableHead className="px-4 py-3 font-semibold text-white">LOCATION</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-white text-right">ORDER AMOUNT</TableHead>
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
                              <Skeleton className="h-3 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell className="px-4 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-slate-500">
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
                                isSelected && "bg-blue-50/50 dark:bg-blue-900/10"
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
                                <div className="text-slate-900 dark:text-slate-100">{r.barangayName || r.barangayCode || '-'}</div>
                                <div className="text-xs text-slate-500">{r.municipalityName || r.municipalityCode || '-'}</div>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100">
                                {r.orderAmount !== null ? formatCurrency(r.orderAmount) : '-'}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center">
                                <Badge 
                                  variant={warnings > 0 ? 'destructive' : 'default'} 
                                  className={cn(
                                    "font-medium shadow-none",
                                    warnings === 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  )}
                                >
                                  {warnings > 0 ? `${warnings} Warnings` : 'Success'}
                                </Badge>
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
              {viewMode === 'card' && (
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
                              isSelected && "ring-2 ring-blue-500 border-transparent"
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
                                  <p className="font-semibold text-blue-600 dark:text-blue-400">{r.orderAmount !== null ? formatCurrency(r.orderAmount) : '-'}</p>
                                </div>
                              </div>
                              <div className="pt-2">
                                <p className="text-xs text-slate-500 truncate">
                                  <MapPin className="inline-block w-3 h-3 mr-1 -mt-0.5" />
                                  {[r.barangayName || r.barangayCode, r.municipalityName || r.municipalityCode].filter(Boolean).join(', ') || '-'}
                                </p>
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
                  pageIndex={meta.page}
                  pageSize={meta.limit}
                  totalCount={meta.total}
                  totalPages={meta.totalPages || 1}
                  setPageIndex={setPageIndex}
                  setPageSize={setPageSize}
                  isLoading={isLoading || isFetching}
                />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TreasuryPaymentsReport;
