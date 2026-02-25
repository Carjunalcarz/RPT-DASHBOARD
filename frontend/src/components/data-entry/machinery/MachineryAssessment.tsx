import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, Cog } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { RptAssRecord } from '@/services/rptAssService';

interface MachineryAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
}

interface MachineryRecord {
  id: string;
  kind: string;
  classification: string;
  actualUse: string;
  brandModel: string; // Mapped from SUB_CLASS or similar if available, or create new field
  capacity: string;   // Example field
  acquisitionDate: string;
  acquisitionCost: number;
  depreciation: number;
  marketValue: number;
  assessmentLevel: number;
  assessedValue: number;
  taxable: boolean;
  idleLand: boolean;
}

interface FormData {
  classification: string;
  actualUse: string;
  brandModel: string;
  capacity: string;
  acquisitionDate: string;
  acquisitionCost: string;
  depreciation: string;
  assessmentLevel: string;
  taxable: boolean;
  idleLand: boolean;
}

// Options
const classificationOptions = [
  { value: '', label: 'Select Classification' },
  { value: 'C', label: 'C - Commercial' },
  { value: 'I', label: 'I - Industrial' },
  { value: 'A', label: 'A - Agricultural' },
];

const actualUseOptions = [
  { value: '', label: 'Select Actual Use' },
  { value: 'MFG', label: 'MFG - Manufacturing' },
  { value: 'PROC', label: 'PROC - Processing' },
  { value: 'PWR', label: 'PWR - Power Generation' },
  { value: 'TRAN', label: 'TRAN - Transportation' },
];

const defaultFormData: FormData = {
  classification: '',
  actualUse: '',
  brandModel: '',
  capacity: '',
  acquisitionDate: '',
  acquisitionCost: '',
  depreciation: '',
  assessmentLevel: '',
  taxable: true,
  idleLand: false,
};

const MachineryAssessment: React.FC<MachineryAssessmentProps> = ({ records: apiRecords, isEnabled }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<MachineryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MachineryRecord | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Computed values
  const [computedValues, setComputedValues] = useState({
    marketValue: 0,
    assessedValue: 0,
  });

  useEffect(() => {
    if (apiRecords) {
      const mapped = apiRecords.map((r, index) => ({
        id: r.TDN + '-' + index,
        kind: r.KIND,
        classification: r.CLASSIFICATION,
        actualUse: r.ACTUAL_USE || '',
        brandModel: r.SUB_CLASS || '', // Using SUB_CLASS as Brand/Model placeholder
        capacity: '', // No direct mapping in API yet
        acquisitionDate: r.EFF_DATE ? new Date(r.EFF_DATE).toISOString().split('T')[0] : '',
        acquisitionCost: r.TOTALDIRECTCOST || 0, // Mapping to total cost
        depreciation: 0, // Need logic or field
        marketValue: r.MARKET_VAL || 0,
        assessmentLevel: r.ASS_LEVEL || 0,
        assessedValue: r.ASS_VALUE || 0,
        taxable: r.TAXABILITY === 'true' || r.TAXABILITY === 'TAXABLE' || r.TAXABLE_RATE > 0,
        idleLand: r.IdleLand || false,
      }));
      setRecords(mapped);
    }
  }, [apiRecords]);

  // Calculate values
  useEffect(() => {
    const cost = parseFloat(formData.acquisitionCost) || 0;
    const depRate = parseFloat(formData.depreciation) || 0;
    const assessmentLevel = parseFloat(formData.assessmentLevel) || 0;

    // Market Value = Acquisition Cost - (Acquisition Cost * Depreciation Rate / 100)
    // Simplified logic
    const marketValue = cost - (cost * (depRate / 100));
    
    // Assessed Value = Market Value * (Assessment Level / 100)
    const assessedValue = marketValue * (assessmentLevel / 100);

    setComputedValues({
      marketValue,
      assessedValue,
    });
  }, [formData.acquisitionCost, formData.depreciation, formData.assessmentLevel]);

  // Handle row selection
  const handleRowSelect = (record: MachineryRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      classification: record.classification,
      actualUse: record.actualUse,
      brandModel: record.brandModel,
      capacity: record.capacity,
      acquisitionDate: record.acquisitionDate,
      acquisitionCost: record.acquisitionCost.toString(),
      depreciation: record.depreciation.toString(),
      assessmentLevel: record.assessmentLevel.toString(),
      taxable: record.taxable,
      idleLand: record.idleLand,
    });
  };

  // CRUD Handlers
  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData(defaultFormData);
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setFormData(defaultFormData);
    }
  };

  const handleSave = () => {
    const newRecord: MachineryRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      kind: 'Machinery',
      classification: formData.classification,
      actualUse: formData.actualUse,
      brandModel: formData.brandModel,
      capacity: formData.capacity,
      acquisitionDate: formData.acquisitionDate,
      acquisitionCost: parseFloat(formData.acquisitionCost) || 0,
      depreciation: parseFloat(formData.depreciation) || 0,
      marketValue: computedValues.marketValue,
      assessmentLevel: parseFloat(formData.assessmentLevel) || 0,
      assessedValue: computedValues.assessedValue,
      taxable: formData.taxable,
      idleLand: formData.idleLand,
    };

    if (isAdding) {
      setRecords(prev => [...prev, newRecord]);
    } else {
      setRecords(prev => prev.map(r => r.id === selectedRecord!.id ? newRecord : r));
    }

    setSelectedRecord(newRecord);
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      handleRowSelect(selectedRecord);
    } else {
      setFormData(defaultFormData);
    }
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isLocalFormEnabled = isEditing || isAdding;
  const isFormEnabled = isLocalFormEnabled;
  const canModify = isEnabled && !isLocalFormEnabled;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" data-testid="machinery-assessment">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{
          background: 'var(--header-gradient)',
          ['--header-gradient' as any]: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="--header-gradient"] {
              --header-gradient: linear-gradient(to right, ${headerColorDark}, ${headerColorDark}dd) !important;
            }
          }
        `}</style>
        <div className="flex items-center gap-2">
          <Cog size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Machinery Assessment</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button onClick={handleAdd} disabled={!canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={14} /> Add
          </button>
          <button onClick={handleEdit} disabled={!selectedRecord || !canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={handleDelete} disabled={!selectedRecord || !canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed">
            <Trash2 size={14} /> Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button onClick={handleSave} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={14} /> Save
          </button>
          <button onClick={handleCancel} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <X size={14} /> Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button onClick={handleRefresh} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handlePrint} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="machinery-records-table">
          <thead className="text-white" style={{ backgroundColor: 'var(--table-header-bg)', ['--table-header-bg' as any]: headerColor }}>
            <style>{`
              @media (prefers-color-scheme: dark) {
                .dark thead[style*="--table-header-bg"] {
                  --table-header-bg: ${headerColorDark} !important;
                }
              }
            `}</style>
            <tr>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Kind</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Class</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Actual Use</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Brand/Model</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Acquisition Cost</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Market Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Assessment Level</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Assessed Value</th>
              <th className="px-2 py-2 text-center font-medium">Taxability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No machinery records. Click "Add" to create one.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-orange-100 dark:bg-orange-900/30'
                      : index % 2 === 0
                      ? 'bg-orange-50/30 dark:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900'
                  } hover:bg-orange-100 dark:hover:bg-orange-900/30`}
                >
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.actualUse}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.brandModel}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.acquisitionCost)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.marketValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{record.assessmentLevel}%</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.assessedValue)}</td>
                  <td className="px-2 py-1.5 text-center">{record.taxable ? 'Taxable' : 'Exempt'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Classification:</label>
              <select value={formData.classification} onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60">
                {classificationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Actual Use:</label>
              <select value={formData.actualUse} onChange={(e) => setFormData(prev => ({ ...prev, actualUse: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60">
                {actualUseOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Brand/Model:</label>
              <input type="text" value={formData.brandModel} onChange={(e) => setFormData(prev => ({ ...prev, brandModel: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Acquisition Date:</label>
              <input type="date" value={formData.acquisitionDate} onChange={(e) => setFormData(prev => ({ ...prev, acquisitionDate: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Acquisition Cost:</label>
              <input type="number" step="0.01" value={formData.acquisitionCost} onChange={(e) => setFormData(prev => ({ ...prev, acquisitionCost: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Depreciation Rate:</label>
              <div className="flex-1 flex items-center gap-1">
                <input type="number" step="0.01" value={formData.depreciation} onChange={(e) => setFormData(prev => ({ ...prev, depreciation: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-4">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Market Value:</label>
              <input type="text" value={formatCurrency(computedValues.marketValue)} readOnly className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Assessment Level:</label>
              <div className="flex-1 flex items-center gap-1">
                <input type="number" step="0.01" value={formData.assessmentLevel} onChange={(e) => setFormData(prev => ({ ...prev, assessmentLevel: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-4">%</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Assessed Value:</label>
              <input type="text" value={formatCurrency(computedValues.assessedValue)} readOnly className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed font-medium" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Taxable:</label>
              <input type="checkbox" checked={formData.taxable} onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))} disabled={!isFormEnabled} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-60" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">Idle Land:</label>
              <input type="checkbox" checked={formData.idleLand} onChange={(e) => setFormData(prev => ({ ...prev, idleLand: e.target.checked }))} disabled={!isFormEnabled} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineryAssessment;
