import React, { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  Database,
  User,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

import { getAuditLogs } from '@/services/auditService';
import { AuditLogParams, AuditLog } from '@/types/audit';

const AuditTrail: React.FC = () => {
  const [params, setParams] = useState<AuditLogParams>({
    page: 1,
    limit: 10,
    source: 'supabase',
    action: '',
    tableName: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['audit-logs', params],
    ([_, p]) => getAuditLogs(p),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: keyof AuditLogParams, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setParams({
      page: 1,
      limit: 10,
      source: 'supabase',
      action: '',
      tableName: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
  };

  const renderPagination = () => {
    if (!data || data.totalPages <= 1) return null;

    const currentPage = data.page;
    const totalPages = data.totalPages;
    
    // Logic to show limited page numbers
    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxPagesToShow = 5;
      
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Always show first page
        pageNumbers.push(1);
        
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 3) {
          endPage = 4;
        }
        if (currentPage >= totalPages - 2) {
          startPage = totalPages - 3;
        }
        
        if (startPage > 2) {
          pageNumbers.push('ellipsis-start');
        }
        
        for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
        }
        
        if (endPage < totalPages - 1) {
          pageNumbers.push('ellipsis-end');
        }
        
        // Always show last page
        pageNumbers.push(totalPages);
      }
      return pageNumbers;
    };

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="gap-1 pl-2.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          </PaginationItem>
          
          {getPageNumbers().map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                <PaginationEllipsis />
              ) : (
                <Button
                  variant={currentPage === page ? "outline" : "ghost"}
                  size="icon"
                  onClick={() => handlePageChange(page as number)}
                  className={currentPage === page ? "border-blue-500 text-blue-600 bg-blue-50" : ""}
                >
                  {page}
                </Button>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
             <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="gap-1 pr-2.5"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const getActionBadgeVariant = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('INSERT')) return 'default'; // blue/black usually
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'secondary'; // gray/secondary
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'destructive'; // red
    return 'outline';
  };

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('INSERT')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6 p-6 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Audit Trail</h2>
        <p className="text-muted-foreground">
          Monitor and track system activities, user actions, and data changes across the platform.
        </p>
      </div>
      
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <div className="flex-1 lg:max-w-full">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Source</label>
              <Select
                value={params.source}
                onValueChange={(value) => handleFilterChange('source', value)}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select Source" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supabase">Supabase (PostgreSQL)</SelectItem>
                  <SelectItem value="mssql">MSSQL Server</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Action</label>
              <Select
                value={params.action || "ALL"}
                onValueChange={(value) => handleFilterChange('action', value === "ALL" ? "" : value)}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Actions" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table Name Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Table / Module</label>
              <div className="relative">
                <FileText className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. users, tasks"
                  value={params.tableName || ''}
                  onChange={(e) => handleFilterChange('tableName', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

             {/* User ID Filter */}
             <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">User ID</label>
              <div className="relative">
                <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by User ID"
                  value={params.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading || isValidating}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isValidating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {(params.action || params.tableName || params.userId || params.startDate || params.endDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 lg:px-3">
                  Reset Filters
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {data?.total ? `Showing ${(data.page - 1) * 10 + 1}-${Math.min(data.page * 10, data.total)} of ${data.total} records` : ''}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead className="w-[150px]">Table</TableHead>
                    <TableHead className="w-[100px]">Record ID</TableHead>
                    <TableHead className="w-[150px]">User</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading Skeletons
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Alert variant="destructive" className="mx-auto max-w-md my-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>
                            Failed to load audit logs. Please try again later.
                          </AlertDescription>
                        </Alert>
                      </TableCell>
                    </TableRow>
                  ) : data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No audit records found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-xs ${getActionColor(log.action)}`}>
                            {log.action.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.tableName}</TableCell>
                        <TableCell className="font-mono text-xs">{log.recordId}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]" title={log.userId}>
                              {log.userEmail || log.userId || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View JSON
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {renderPagination()}
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full JSON record of the selected audit event.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-muted-foreground">Timestamp:</span>
                  <div className="font-medium">{format(new Date(selectedLog.timestamp), 'PPpp')}</div>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Action:</span>
                  <div>
                    <Badge variant="outline" className={`font-mono text-xs ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Table / Record ID:</span>
                  <div className="font-medium">{selectedLog.tableName} / {selectedLog.recordId}</div>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">User:</span>
                  <div className="font-medium">
                    {selectedLog.userEmail ? (
                      <span title={selectedLog.userId}>{selectedLog.userEmail}</span>
                    ) : (
                      selectedLog.userId || 'System'
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-4 font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrail;
