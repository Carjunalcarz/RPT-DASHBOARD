import React, { useMemo, useState } from 'react';
import { AlertCircle, Filter, Loader2, RefreshCw } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { getTreasuryPaymentsReport, TreasuryPaymentExportRow } from '@/services/reportsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';

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

const TreasuryPaymentsReport: React.FC = () => {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
    return base;
  }, [applied, pageIndex, pageSize]);

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
  };

  return (
    <div className="space-y-6 p-6 pb-16 md:block" data-testid="treasury-payments-report-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Treasury Payments</h2>
          <p className="text-muted-foreground">Payments marked as paid and exported for treasury reporting.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine treasury exports by date, order, and property fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">From</label>
              <Input type="date" value={draft.from} onChange={(e) => setDraft((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">To</label>
              <Input type="date" value={draft.to} onChange={(e) => setDraft((p) => ({ ...p, to: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Order No.</label>
              <Input value={draft.orderNumber} onChange={(e) => setDraft((p) => ({ ...p, orderNumber: e.target.value }))} placeholder="OOP-..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">TDN</label>
              <Input value={draft.tdn} onChange={(e) => setDraft((p) => ({ ...p, tdn: e.target.value }))} placeholder="TDN" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Owner Name</label>
              <Input value={draft.ownerName} onChange={(e) => setDraft((p) => ({ ...p, ownerName: e.target.value }))} placeholder="Owner" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Municipality Code</label>
              <Input
                value={draft.municipalityCode}
                onChange={(e) => setDraft((p) => ({ ...p, municipalityCode: e.target.value }))}
                placeholder="MUNCODE"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Barangay Code</label>
              <Input
                value={draft.barangayCode}
                onChange={(e) => setDraft((p) => ({ ...p, barangayCode: e.target.value }))}
                placeholder="BCODE"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="gap-2 flex-1">
                <Filter className="h-4 w-4" />
                Apply
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Exported Payments</CardTitle>
            <CardDescription>
              Showing {meta.total > 0 ? Math.min((meta.page - 1) * meta.limit + 1, meta.total) : 0} to {Math.min(meta.page * meta.limit, meta.total)} of{' '}
              {meta.total} records
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Paid At</TableHead>
                <TableHead>Order No.</TableHead>
                <TableHead>TDN</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Municipality</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead className="text-right">Order Amount</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Assessed Value</TableHead>
                <TableHead className="text-center">Warnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading report data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No exported payments found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const warnings = (r.validationErrors || []).length;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(r.paidAt)}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{r.orderNumber}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tdn || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.pin || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.ownerName || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.municipalityName || r.municipalityCode || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.barangayName || r.barangayCode || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{r.orderAmount !== null ? formatCurrency(r.orderAmount) : '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatCurrency(r.totalMarketValue || 0)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatCurrency(r.totalAssessedValue || 0)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={warnings > 0 ? 'destructive' : 'secondary'}>{warnings}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="mt-4">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasuryPaymentsReport;
