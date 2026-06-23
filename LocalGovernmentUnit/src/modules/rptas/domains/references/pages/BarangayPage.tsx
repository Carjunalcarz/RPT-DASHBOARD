import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/modules/rptas/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/rptas/ui/table';
import { Input } from '@/modules/rptas/ui/input';
import { Badge } from '@/modules/rptas/ui/badge';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import { getBarangays, BarangayRecord } from '../../../shared/services/barangayService';

const BarangayPage: React.FC = () => {
  const [barangays, setBarangays] = useState<BarangayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchBarangays = async () => {
    setIsLoading(true);
    try {
      const response = await getBarangays(pageIndex, pageSize, debouncedSearch);
      setBarangays(response.data || []);
      setMeta(response.meta || { total: 0, page: 1, pageSize: 20, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching barangays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBarangays();
  }, [pageIndex, pageSize, debouncedSearch]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Barangay Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and view all registered barangays and their respective districts.
          </p>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
        <div className="bg-background dark:bg-background border-b border-border dark:border-border px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-foreground tracking-wide">
              Barangay Records
            </h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted dark:text-muted" />
              <Input 
                placeholder="Search barangay or code..." 
                className="pl-9 h-8 text-xs bg-surface dark:bg-surface border-border dark:border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-background dark:bg-background border-b border-border dark:border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted w-[120px]">Code</th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">Barangay Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">District</th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">City/Municipality</th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">Province</th>
                <th className="px-3 py-2 text-left font-medium text-muted dark:text-muted">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted dark:text-muted">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mb-2" />
                      <p>Loading barangay records...</p>
                    </div>
                  </td>
                </tr>
              ) : barangays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted dark:text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MapPin className="h-6 w-6 opacity-50 mb-1" />
                      <p className="font-medium">No barangays found</p>
                      <p className="text-xs opacity-75">Try adjusting your search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                barangays.map((barangay) => (
                  <tr 
                    key={barangay.CODE} 
                    className="bg-background dark:bg-background/30 hover:bg-muted/10 dark:hover:bg-background transition-colors"
                  >
                    <td className="px-3 py-2 border-r border-border dark:border-border font-mono text-xs">
                      {barangay.CODE}
                    </td>
                    <td className="px-3 py-2 border-r border-border dark:border-border font-medium text-foreground dark:text-foreground">
                      {barangay.DESCRIPTION}
                    </td>
                    <td className="px-3 py-2 border-r border-border dark:border-border">
                      <span className="px-2 py-0.5 rounded border border-border dark:border-border text-muted dark:text-muted">
                        {barangay.DISTRICT || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-border dark:border-border text-muted dark:text-muted">
                      {barangay.CITY || '-'}
                    </td>
                    <td className="px-3 py-2 border-r border-border dark:border-border text-muted dark:text-muted">
                      {barangay.PROV || '-'}
                    </td>
                    <td className="px-3 py-2 text-muted dark:text-muted">
                      {barangay.REGION || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border dark:border-border p-3 bg-background dark:bg-background">
          <DataTablePagination
            pageIndex={meta.page}
            pageSize={meta.pageSize}
            totalCount={meta.total}
            totalPages={meta.totalPages}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default BarangayPage;
