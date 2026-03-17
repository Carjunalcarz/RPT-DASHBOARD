import React, { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Filter, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPropertyReport, getReportSummary, getTaxBegYears, PropertyReport, ReportSummary } from '../services/reportsService';

const Reports: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [properties, setProperties] = useState<PropertyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxBegYrOptions, setTaxBegYrOptions] = useState<string[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    municipality: '',
    barangay: '',
    taxBegYr: new Date().getFullYear().toString()
  });

  const fetchData = async (page = 1, nextFilters = filters) => {
    setLoading(true);
    try {
      const [summaryData, response] = await Promise.all([
        getReportSummary(nextFilters),
        getPropertyReport({ ...nextFilters, page, limit: meta.limit })
      ]);
      setSummary(summaryData);
      setProperties(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const currentYear = new Date().getFullYear().toString();
      const initialFilters = { municipality: '', barangay: '', taxBegYr: currentYear };
      setFilters(initialFilters);
      try {
        const years = await getTaxBegYears();
        const merged = Array.from(new Set([currentYear, ...years].filter(Boolean)));
        setTaxBegYrOptions(merged);
      } catch (error) {
        setTaxBegYrOptions([currentYear]);
      }
      await fetchData(1, initialFilters);
    };
    init();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchData(1, filters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      fetchData(newPage, filters);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div data-testid="reports-page" className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Real Property Reports
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive overview of property assessments and tax data
          </p>
        </div>
        <button 
          onClick={() => fetchData(meta.page, filters)} 
          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Properties</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary?.totalProperties.toLocaleString() || '0'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Approved FAAS</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary?.approvedFaasCount.toLocaleString() || '0'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Market Value</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary?.totalMarketValue || 0)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Assessed Value</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(summary?.totalAssessedValue || 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Municipality</label>
          <input
            type="text"
            name="municipality"
            value={filters.municipality}
            onChange={handleFilterChange}
            placeholder="Search Municipality..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Barangay</label>
          <input
            type="text"
            name="barangay"
            value={filters.barangay}
            onChange={handleFilterChange}
            placeholder="Search Barangay..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Beg Yr</label>
          <select
            name="taxBegYr"
            value={filters.taxBegYr}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]"
          >
            <option value="">All years</option>
            {taxBegYrOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 transition-colors text-sm font-medium h-[38px]"
        >
          <Filter size={16} />
          Apply Filters
        </button>
      </div>

      {/* Property Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Property Assessment Records</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Assessment ID</th>
                <th className="px-4 py-3 whitespace-nowrap">TDN / PIN</th>
                <th className="px-4 py-3 whitespace-nowrap">Owner</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">MUNCODE</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">BCODE</th>
                <th className="px-4 py-3 whitespace-nowrap">Kind</th>
                <th className="px-4 py-3 whitespace-nowrap">Taxability</th>
                <th className="px-4 py-3 whitespace-nowrap">Classification</th>
                <th className="px-4 py-3 whitespace-nowrap">Subclass</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Area</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Market Value</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Ass. Level</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Ass. Value</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">Tax Beg Yr</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">Trans Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 size={20} className="animate-spin" />
                      Loading report data...
                    </div>
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No property records found matching your criteria.
                  </td>
                </tr>
              ) : (
                properties.map((prop) => (
                  <tr key={prop.assessmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {prop.assessmentId.split('-')[0]}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-slate-100">{prop.tdn || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{prop.pin || 'No PIN'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-slate-100" title={prop.ownerName}>
                        {prop.ownerName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                      {prop.muncode}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                      {prop.bcode}
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">
                      {prop.kind}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        prop.taxability?.toLowerCase() === 'taxable' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {prop.taxability}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" title={prop.classification}>
                      {prop.classification}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" title={prop.subclass}>
                      {prop.subclass}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {prop.area.toLocaleString()} {prop.measurement}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatCurrency(prop.marketValue)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {prop.assLevel}%
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {formatCurrency(prop.assValue)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {prop.taxBegYr}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                      {prop.transCode}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Page <span className="font-medium text-slate-900 dark:text-slate-100">{meta.page}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{meta.totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1 || loading}
              className="p-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              className="p-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
