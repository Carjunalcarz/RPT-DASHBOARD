import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, TreePine, ArrowDownUp, Trees } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { RptAssRecord } from '@/services/rptAssService';
import LandAdjustmentModal, { LandAdjustment } from './LandAdjustmentModal';
import TreesModal, { TreePlant } from './TreesModal';

interface LandAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
}

interface LandRecord {
  id: string;
  tdn?: string; // Add TDN field
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
  adjustments?: LandAdjustment[];
  trees?: TreePlant[];
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

// Options for dropdowns (Example options, extend as needed)
const classificationOptions = [
  { value: '', label: 'Select Classification' },
  { value: 'R', label: 'R - Residential' },
  { value: 'C', label: 'C - Commercial' },
  { value: 'I', label: 'I - Industrial' },
  { value: 'A', label: 'A - Agricultural' },
  { value: 'M', label: 'M - Mixed Use' },
  { value: 'T', label: 'T - Timberland' },
  { value: 'Min', label: 'Min - Mineral' },
];

const actualUseOptions = [
  { value: '', label: 'Select Actual Use' },
  { value: 'AR', label: 'AR - Agricultural Residential' },
  { value: 'COCL', label: 'COCL - Coco Land' },
  { value: 'RICL', label: 'RICL - Rice Land' },
  { value: 'CORN', label: 'CORN - Corn Land' },
  { value: 'ORCH', label: 'ORCH - Orchard' },
  { value: 'FISH', label: 'FISH - Fishpond' },
  { value: 'PAST', label: 'PAST - Pasture' },
  { value: 'TIMB', label: 'TIMB - Timberland' },
];

const subClassOptions = [
  { value: '', label: 'Select Sub Class' },
  { value: 'NONE', label: 'NONE' },
  { value: 'COCL1', label: 'COCL1' },
  { value: 'COCL2', label: 'COCL2' },
  { value: 'COCL3', label: 'COCL3' },
  { value: 'RICL1', label: 'RICL1' },
  { value: 'RICL2', label: 'RICL2' },
];

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

const LandAssessment: React.FC<LandAssessmentProps> = ({ records: apiRecords, isEnabled }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [selectedTdn, setSelectedTdn] = useState<string>(''); // Store TDN for trees modal
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTreesOpen, setIsTreesOpen] = useState(false);
  
  // Computed values
  const [computedValues, setComputedValues] = useState({
    baseMarketValue: 0,
    adjustedMarketValue: 0,
    assessedValue: 0,
  });

  useEffect(() => {
    if (apiRecords) {
      const mapped = apiRecords.map((r, index) => ({
        id: r.TDN + '-' + index, // Use TDN + index as ID if multiple records share TDN or just for unique key
        tdn: r.TDN,
        kind: r.KIND,
        classification: r.CLASSIFICATION,
        actualUse: r.ACTUAL_USE || '',
        subClass: r.SUB_CLASS || '',
        area: r.AREA || 0,
        unitValue: r.UNIT_VALUE || 0,
        baseMarketValue: r.MARKET_VAL || 0,
        adjustedMarketValue: r.MARKET_VAL || 0, // Using same value for now as API might not provide split
        assessmentLevel: r.ASS_LEVEL || 0,
        assessedValue: r.ASS_VALUE || 0,
        taxable: r.TAXABILITY === 'true' || r.TAXABILITY === 'TAXABLE' || r.TAXABLE_RATE > 0, // Handle boolean or string
        beneficialUse: r.BU === 'true' || r.BU === '1', // Handle boolean or string representation
        idleLand: r.IdleLand || false,
      }));
      setRecords(mapped);
    }
  }, [apiRecords]);

  // Calculate values based on form input
  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    const assessmentLevel = parseFloat(formData.assessmentLevel) || 0;

    // Base Market Value = Area × Unit Value
    const baseMarketValue = area * unitValue;
    
    // Calculate total adjustment from selectedRecord
    const currentAdjustments = selectedRecord?.adjustments || [];
    // Recalculate adjustment values based on new Base Market Value if they are percentage based
    // Ideally we iterate adjustments and use percentage.
    const totalAdjustment = currentAdjustments.reduce((sum, a) => {
        // If we want strict percentage adherence:
        return sum + (baseMarketValue * (a.percentage / 100));
        // Or if we trust the valueAdjustment in the object:
        // return sum + a.valueAdjustment;
    }, 0);
    
    // Adjusted Market Value
    const adjustedMarketValue = baseMarketValue + totalAdjustment;
    
    // Assessed Value = Adjusted Market Value × (Assessment Level / 100)
    const assessedValue = adjustedMarketValue * (assessmentLevel / 100);

    setComputedValues({
      baseMarketValue,
      adjustedMarketValue,
      assessedValue,
    });
  }, [formData.area, formData.unitValue, formData.assessmentLevel, selectedRecord?.adjustments]);

  // Handle row selection
  const handleRowSelect = (record: LandRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setSelectedTdn(record.tdn || '');
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

  // Handle Add
  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData(defaultFormData);
  };

  // Handle Edit
  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  // Handle Delete
  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setFormData(defaultFormData);
    }
  };

  // Handle Save
  const handleSave = () => {
    const newRecord: LandRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      kind: 'Land',
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
      adjustments: selectedRecord?.adjustments || [],
      trees: selectedRecord?.trees || [],
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

  // Handle Save Adjustments
  const handleSaveAdjustments = (newAdjustments: LandAdjustment[]) => {
    if (!selectedRecord) return;
    const updatedRecord = { ...selectedRecord, adjustments: newAdjustments };
    setSelectedRecord(updatedRecord);
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  // Handle Save Trees
  const handleSaveTrees = (newTrees: TreePlant[]) => {
    if (!selectedRecord) return;
    const updatedRecord = { ...selectedRecord, trees: newTrees };
    setSelectedRecord(updatedRecord);
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  // Handle Cancel
  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      setFormData({
        classification: selectedRecord.classification,
        actualUse: selectedRecord.actualUse,
        subClass: selectedRecord.subClass,
        area: selectedRecord.area.toString(),
        unitValue: selectedRecord.unitValue.toString(),
        assessmentLevel: selectedRecord.assessmentLevel.toString(),
        taxable: selectedRecord.taxable,
        beneficialUse: selectedRecord.beneficialUse,
        idleLand: selectedRecord.idleLand,
      });
    } else {
      setFormData(defaultFormData);
    }
  };

  // Handle Refresh
  const handleRefresh = () => {
    console.log('Refreshing data...');
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Format currency
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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" data-testid="land-assessment">
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
          <TreePine size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Land Assessment</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleAdd}
            disabled={!canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="add-land-btn"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="edit-land-btn"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="delete-land-btn"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleSave}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-land-btn"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-land-btn"
          >
            <X size={14} />
            Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="refresh-land-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="print-land-btn"
          >
            <Printer size={14} />
            Print
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            disabled={!selectedRecord || isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-orange-600 dark:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownUp size={14} />
            Adjustment
          </button>
          <button
            onClick={() => setIsTreesOpen(true)}
            disabled={!selectedRecord || isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-green-600 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trees size={14} />
            Trees
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="land-records-table">
          <thead
            className="text-white"
            style={{
              backgroundColor: 'var(--table-header-bg)',
              ['--table-header-bg' as any]: headerColor,
            }}
          >
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
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No land records. Click "Add" to create one.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : index % 2 === 0
                      ? 'bg-green-50/30 dark:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900'
                  } hover:bg-green-100 dark:hover:bg-green-900/30`}
                  data-testid={`land-row-${record.id}`}
                >
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.actualUse}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.subClass}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{record.area.toFixed(4)}</td>
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
      <LandAdjustmentModal
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        initialAdjustments={selectedRecord?.adjustments || []}
        onSave={handleSaveAdjustments}
        baseMarketValue={computedValues.baseMarketValue}
      />
      <TreesModal
        open={isTreesOpen}
        onOpenChange={setIsTreesOpen}
        initialTrees={selectedRecord?.trees || []}
        onSave={handleSaveTrees}
        tdn={selectedTdn} // Pass the selected TDN
      />

      {/* Form Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Classification */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Classification:
              </label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-classification"
              >
                {classificationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Actual Use */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Actual Use:
              </label>
              <select
                value={formData.actualUse}
                onChange={(e) => setFormData(prev => ({ ...prev, actualUse: e.target.value }))}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-actual-use"
              >
                {actualUseOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sub Class */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Sub Class:
              </label>
              <select
                value={formData.subClass}
                onChange={(e) => setFormData(prev => ({ ...prev, subClass: e.target.value }))}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-sub-class"
              >
                {subClassOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Area:
              </label>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.0001"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  disabled={!isFormEnabled}
                  placeholder="0.0000"
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-area"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-12">ha.</span>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-3">
            {/* Unit Value */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Unit Value:
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitValue}
                onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))}
                disabled={!isFormEnabled}
                placeholder="0.00"
                className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-unit-value"
              />
            </div>

            {/* Base Market Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Base Market Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.baseMarketValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed"
                data-testid="display-base-market-value"
              />
            </div>

            {/* Adjusted Market Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Adjusted Market Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.adjustedMarketValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed"
                data-testid="display-adjusted-market-value"
              />
            </div>

            {/* Assessment Level */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Assessment Level:
              </label>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={formData.assessmentLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, assessmentLevel: e.target.value }))}
                  disabled={!isFormEnabled}
                  placeholder="0.00"
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-assessment-level"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-4">%</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Assessed Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Assessed Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.assessedValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed font-medium"
                data-testid="display-assessed-value"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Taxable:
              </label>
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))}
                disabled={!isFormEnabled}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-taxable"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Beneficial Use:
              </label>
              <input
                type="checkbox"
                checked={formData.beneficialUse}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficialUse: e.target.checked }))}
                disabled={!isFormEnabled}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-beneficial-use"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Idle Land:
              </label>
              <input
                type="checkbox"
                checked={formData.idleLand}
                onChange={(e) => setFormData(prev => ({ ...prev, idleLand: e.target.checked }))}
                disabled={!isFormEnabled}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-idle-land"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandAssessment;
