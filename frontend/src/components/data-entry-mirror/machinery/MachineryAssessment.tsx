import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, Settings, ArrowDownUp } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { RptAssRecord } from '@/services/rptAssService';
import { getClassifications, getActualUses, getSubClasses, Classification, ActualUse, SubClass } from '@/services/classificationService';
import MachineryItemsModal from './MachineryItemsModal';

interface MachineryAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
}

interface MachineryRecord {
  id: string;
  uniqueId?: string;
  tdn?: string;
  kind: string;
  classification: string;
  actualUse: string;
  subClass: string;
  area: number;
  unitValue: number;
  baseMarketValue: number;
  adjustedMarketValue: number;
  assessmentLevel: number;
  assessedValue: number;
  taxable: boolean;
  beneficialUse: boolean;
  idleLand: boolean;
}

interface FormData {
  classification: string;
  actualUse: string;
  subClass: string;
  area: string;
  unitValue: string;
  assessmentLevel: string;
  taxable: boolean;
  beneficialUse: boolean;
  idleLand: boolean;
}

const defaultFormData: FormData = {
  classification: '',
  actualUse: '',
  subClass: '',
  area: '',
  unitValue: '',
  assessmentLevel: '',
  taxable: true,
  beneficialUse: false,
  idleLand: false,
};

const MachineryAssessment: React.FC<MachineryAssessmentProps> = ({ records: apiRecords, isEnabled }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<MachineryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MachineryRecord | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  
  // Dynamic Options State
  const [classificationOptions, setClassificationOptions] = useState<Classification[]>([]);
  const [actualUseOptions, setActualUseOptions] = useState<ActualUse[]>([]);
  const [subClassOptions, setSubClassOptions] = useState<SubClass[]>([]);

  // Load Classifications on Mount
  useEffect(() => {
    getClassifications()
      .then(setClassificationOptions)
      .catch(err => console.error('Failed to load classifications', err));
  }, []);

  // Load Actual Uses when Classification changes
  useEffect(() => {
    // If no classification is selected, don't fetch anything (or clear existing)
    if (formData.classification) {
      // Clear existing options first to avoid stale data while loading
      setActualUseOptions([]);
      setSubClassOptions([]);
      
      // Fetch filtered options
      getActualUses({ mainClass: formData.classification })
        .then(data => {
            // Double-check client-side filtering if API returns everything
            const filtered = data.filter(item => item.MainClass === formData.classification);
            setActualUseOptions(filtered);
        })
        .catch(err => console.error('Failed to load actual uses', err));
    } else {
      setActualUseOptions([]);
      setSubClassOptions([]);
    }
  }, [formData.classification]);

  // Load SubClasses when Actual Use changes
  useEffect(() => {
    if (formData.actualUse && formData.classification) {
      // Fetch filtered options based on selected Actual Use code (prefix match)
      getSubClasses({ 
        mainClass: formData.classification,
        actualUseCode: formData.actualUse 
      })
        .then(data => {
            // Optional: Client-side filtering if needed
            // Ensure subclasses belong to the correct main class
            const filtered = data.filter(item => item.MainClass === formData.classification);
            setSubClassOptions(filtered);
        })
        .catch(err => console.error('Failed to load subclasses', err));
    } else {
      setSubClassOptions([]);
    }
  }, [formData.actualUse, formData.classification]);
  
  // Computed values
  const [computedValues, setComputedValues] = useState({
    baseMarketValue: 0,
    adjustedMarketValue: 0,
    assessedValue: 0,
  });

  useEffect(() => {
    if (apiRecords) {
      const mapped = apiRecords.filter(r => r.KIND === 'Machinery' || r.KIND === 'MACH').map((r, index) => ({
        id: r.TDN + '-' + index,
        uniqueId: `${r.TDN}-Mach-${index}-${Date.now()}`,
        tdn: r.TDN,
        kind: 'Machinery',
        classification: r.CLASSIFICATION,
        actualUse: r.ACTUAL_USE || '',
        subClass: r.SUB_CLASS || '',
        area: r.AREA || 0,
        unitValue: r.UNIT_VALUE || 0,
        baseMarketValue: r.MARKET_VAL || 0,
        adjustedMarketValue: (r as any).ADJ_MARKET_VAL || r.MARKET_VAL || 0, // Use Adjusted Market Value from API if available
        assessmentLevel: r.ASS_LEVEL || 0,
        assessedValue: r.ASS_VALUE || 0,
        taxable: r.TAXABILITY === 'true' || r.TAXABILITY === 'TAXABLE' || r.TAXABLE_RATE > 0,
        beneficialUse: r.BU === 'true' || r.BU === '1',
        idleLand: r.IdleLand || false,
      }));
      setRecords(mapped);
    }
  }, [apiRecords]);

  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    const assessmentLevel = parseFloat(formData.assessmentLevel) || 0;

    // Base Market Value
    // For machinery, base market value might come from the sum of items, but here we treat it as input or computed
    const baseMarketValue = area > 0 ? area * unitValue : (parseFloat(formData.unitValue) || 0); // Fallback if area is 0
    
    // Simplified adjustment logic without LandAdjustmentModal
    // If we want to sum up machinery items' adjusted values, we would need to fetch them or pass them up.
    // For now, let's assume Adjusted Market Value is Base Market Value unless modified by items.
    
    const adjustedMarketValue = baseMarketValue; 
    const assessedValue = adjustedMarketValue * (assessmentLevel / 100);

    setComputedValues({
      baseMarketValue,
      adjustedMarketValue,
      assessedValue,
    });
  }, [formData.area, formData.unitValue, formData.assessmentLevel]);

  const handleRowSelect = (record: MachineryRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      classification: record.classification,
      actualUse: record.actualUse,
      subClass: record.subClass,
      area: record.area.toString(),
      unitValue: record.unitValue.toString(),
      assessmentLevel: record.assessmentLevel.toString(),
      taxable: record.taxable,
      beneficialUse: record.beneficialUse,
      idleLand: record.idleLand,
    });
  };

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
      tdn: selectedRecord?.tdn, // Preserve TDN
      kind: 'Machinery',
      classification: formData.classification,
      actualUse: formData.actualUse,
      subClass: formData.subClass,
      area: parseFloat(formData.area) || 0,
      unitValue: parseFloat(formData.unitValue) || 0,
      baseMarketValue: computedValues.baseMarketValue,
      adjustedMarketValue: computedValues.adjustedMarketValue,
      assessmentLevel: parseFloat(formData.assessmentLevel) || 0,
      assessedValue: computedValues.assessedValue,
      taxable: formData.taxable,
      beneficialUse: formData.beneficialUse,
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
          <Settings size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Real Property Assessment (Machinery)</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button onClick={handleAdd} disabled={!canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50">
            <Plus size={14} /> Add
          </button>
          <button onClick={handleEdit} disabled={!selectedRecord || !canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={handleDelete} disabled={!selectedRecord || !canModify} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 border rounded shadow-sm flex items-center gap-1.5 text-red-600 disabled:opacity-50">
            <Trash2 size={14} /> Delete
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button onClick={handleSave} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50">
            <Save size={14} /> Save
          </button>
          <button onClick={handleCancel} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50">
            <X size={14} /> Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button onClick={handleRefresh} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setIsAdjustmentOpen(true)} disabled={!selectedRecord} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5 text-orange-600 disabled:opacity-50">
            <ArrowDownUp size={14} /> Adjustment
          </button>
          <button onClick={handlePrint} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
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
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Sub Class</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Area</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Unit Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Base Market Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Adjusted Market Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Assessment Level</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Assessed Value</th>
              <th className="px-2 py-2 text-center font-medium">Taxability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No machinery records found.</td></tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.uniqueId || record.id} onClick={() => handleRowSelect(record)} className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 ${selectedRecord?.id === record.id ? 'bg-blue-100 dark:bg-blue-900/30' : index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}`}>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.actualUse}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.subClass}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{record.area}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.unitValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.baseMarketValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.adjustedMarketValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{record.assessmentLevel}%</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.assessedValue)}</td>
                  <td className="px-2 py-1.5 text-center">{record.taxable ? 'Taxable' : 'Exempt'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <MachineryItemsModal
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        tdn={selectedRecord?.tdn || ''}
      />


      {/* Form Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Classification:</label>
              <select value={formData.classification} onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs border rounded">
                <option value="">Select Classification</option>
                {classificationOptions.map((opt, index) => <option key={`${opt.Code}-${index}`} value={opt.Code}>{opt.Code} - {opt.Description}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Actual Use:</label>
              <select 
                value={formData.actualUse} 
                onChange={(e) => {
                  const selected = e.target.value;
                  const selectedOption = actualUseOptions.find(opt => opt.Code === selected);
                  setFormData(prev => ({ 
                    ...prev, 
                    actualUse: selected,
                    // Auto-populate unit value if available from Actual Use
                    unitValue: selectedOption?.MValue ? selectedOption.MValue.toString() : prev.unitValue
                  }));
                }}
                disabled={!isFormEnabled} 
                className="flex-1 px-2 py-1.5 text-xs border rounded"
              >
                <option value="">Select Actual Use</option>
                {actualUseOptions.map((opt, index) => <option key={`${opt.Code}-${opt.MainClass}-${index}`} value={opt.Code}>{opt.Code} - {opt.Description}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Sub Class:</label>
              <select value={formData.subClass} onChange={(e) => setFormData(prev => ({ ...prev, subClass: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs border rounded">
                <option value="">Select Sub Class</option>
                {subClassOptions.map((opt, index) => <option key={`${opt.Code}-${opt.MainClass}-${index}`} value={opt.Code}>{opt.Code} - {opt.Description}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Area:</label>
              <div className="flex-1 flex items-center gap-1">
                <input type="number" value={formData.area} onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right border rounded" />
                <span className="text-xs w-12">sq. m</span>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-right">Unit Value:</label>
              <input type="number" value={formData.unitValue} onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right border rounded" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-right">Base Market Value:</label>
              <input type="text" value={formatCurrency(computedValues.baseMarketValue)} readOnly className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 border rounded" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-right">Adjusted Market Value:</label>
              <input type="text" value={formatCurrency(computedValues.adjustedMarketValue)} readOnly className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 border rounded" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-right">Assessment Level:</label>
              <div className="flex-1 flex items-center gap-1">
                <input type="number" value={formData.assessmentLevel} onChange={(e) => setFormData(prev => ({ ...prev, assessmentLevel: e.target.value }))} disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right border rounded" />
                <span className="text-xs w-4">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-right">Taxable Rate:</label>
              <input type="number" defaultValue="100" disabled={!isFormEnabled} className="flex-1 px-2 py-1.5 text-xs text-right border rounded" />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Assessed Value:</label>
              <input type="text" value={formatCurrency(computedValues.assessedValue)} readOnly className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 border rounded font-medium" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Taxable:</label>
              <input type="checkbox" checked={formData.taxable} onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))} disabled={!isFormEnabled} className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Beneficial Use:</label>
              <input type="checkbox" checked={formData.beneficialUse} onChange={(e) => setFormData(prev => ({ ...prev, beneficialUse: e.target.checked }))} disabled={!isFormEnabled} className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-right">Idle Land:</label>
              <input type="checkbox" checked={formData.idleLand} onChange={(e) => setFormData(prev => ({ ...prev, idleLand: e.target.checked }))} disabled={!isFormEnabled} className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineryAssessment;
