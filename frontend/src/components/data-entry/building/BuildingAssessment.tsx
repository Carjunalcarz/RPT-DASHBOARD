import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, Building2 } from 'lucide-react';
import StructureTab from './StructureTab';
import AdjustmentTab from './AdjustmentTab';

// Types
interface BuildingRecord {
  id: string;
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

// Options for dropdowns
const classificationOptions = [
  { value: '', label: 'Select Classification' },
  { value: 'R', label: 'R - Residential' },
  { value: 'C', label: 'C - Commercial' },
  { value: 'I', label: 'I - Industrial' },
  { value: 'A', label: 'A - Agricultural' },
  { value: 'M', label: 'M - Mixed Use' },
];

const actualUseOptions = [
  { value: '', label: 'Select Actual Use' },
  { value: 'AR', label: 'AR - Agricultural Residential' },
  { value: 'RR', label: 'RR - Rural Residential' },
  { value: 'UR', label: 'UR - Urban Residential' },
  { value: 'CO', label: 'CO - Commercial Office' },
  { value: 'CR', label: 'CR - Commercial Retail' },
  { value: 'IW', label: 'IW - Industrial Warehouse' },
  { value: 'IM', label: 'IM - Industrial Manufacturing' },
];

const subClassOptions = [
  { value: '', label: 'Select Sub Class' },
  { value: 'NONE', label: 'NONE' },
  { value: 'I', label: 'I - Type I' },
  { value: 'II', label: 'II - Type II' },
  { value: 'III', label: 'III - Type III' },
  { value: 'IV', label: 'IV - Type IV' },
  { value: 'V', label: 'V - Type V' },
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

const BuildingAssessment: React.FC = () => {
  // State for records table
  const [records, setRecords] = useState<BuildingRecord[]>([
    {
      id: '1',
      kind: 'Building',
      classification: 'R',
      actualUse: 'AR',
      subClass: 'NONE',
      area: 49.82,
      unitValue: 4570.00,
      baseMarketValue: 227677.40,
      adjustedMarketValue: 45535.48,
      assessmentLevel: 20,
      assessedValue: 9107.10,
      taxable: true,
      beneficialUse: false,
      idleLand: false,
    },
  ]);

  const [selectedRecord, setSelectedRecord] = useState<BuildingRecord | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'structure' | 'adjustment'>('structure');

  // Computed values
  const [computedValues, setComputedValues] = useState({
    baseMarketValue: 0,
    adjustedMarketValue: 0,
    assessedValue: 0,
  });

  // Calculate values based on form input
  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const unitValue = parseFloat(formData.unitValue) || 0;
    const assessmentLevel = parseFloat(formData.assessmentLevel) || 0;

    // Base Market Value = Area × Unit Value
    const baseMarketValue = area * unitValue;
    
    // Adjusted Market Value = Base Market Value × (Assessment Level / 100)
    const adjustedMarketValue = baseMarketValue * (assessmentLevel / 100);
    
    // Assessed Value = Adjusted Market Value (simplified - in reality may have more factors)
    const assessedValue = adjustedMarketValue;

    setComputedValues({
      baseMarketValue,
      adjustedMarketValue,
      assessedValue,
    });
  }, [formData.area, formData.unitValue, formData.assessmentLevel]);

  // Handle row selection
  const handleRowSelect = (record: BuildingRecord) => {
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
    const newRecord: BuildingRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      kind: 'Building',
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
    // In real app, would fetch from API
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

  const isFormEnabled = isEditing || isAdding;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" data-testid="building-assessment">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Building Assessment</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleAdd}
            disabled={isFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="add-building-btn"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || isFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="edit-building-btn"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || isFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="delete-building-btn"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleSave}
            disabled={!isFormEnabled}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-building-btn"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isFormEnabled}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-building-btn"
          >
            <X size={14} />
            Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="refresh-building-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="print-building-btn"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="building-records-table">
          <thead className="bg-blue-700 dark:bg-blue-800 text-white">
            <tr>
              <th className="px-2 py-2 text-left font-medium border-r border-blue-600">Kind</th>
              <th className="px-2 py-2 text-left font-medium border-r border-blue-600">Class</th>
              <th className="px-2 py-2 text-left font-medium border-r border-blue-600">Actual Use</th>
              <th className="px-2 py-2 text-left font-medium border-r border-blue-600">Sub Class</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Area</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Unit Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Base Market Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Adjusted Market Value</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Assessment Level</th>
              <th className="px-2 py-2 text-right font-medium border-r border-blue-600">Assessed Value</th>
              <th className="px-2 py-2 text-center font-medium">Taxability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No building records. Click "Add" to create one.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : index % 2 === 0
                      ? 'bg-blue-50/30 dark:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900'
                  } hover:bg-blue-100 dark:hover:bg-blue-900/30`}
                  data-testid={`building-row-${record.id}`}
                >
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.actualUse}</td>
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700">{record.subClass}</td>
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">{formatCurrency(record.area)}</td>
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
                  step="0.01"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  disabled={!isFormEnabled}
                  placeholder="0.00"
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-area"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-12">sq.m.</span>
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

      {/* Sub Tabs - Structure and Adjustment */}
      <div className="border-t border-slate-200 dark:border-slate-700">
        {/* Tab Headers */}
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('structure')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === 'structure'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t border-l border-r border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
              data-testid="tab-structure"
            >
              Structure
            </button>
            <button
              onClick={() => setActiveTab('adjustment')}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === 'adjustment'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t border-l border-r border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
              data-testid="tab-adjustment"
            >
              Adjustment
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'structure' && (
            <StructureTab
              buildingId={selectedRecord?.id || ''}
              isFormEnabled={isFormEnabled}
            />
          )}
          {activeTab === 'adjustment' && (
            <AdjustmentTab
              buildingId={selectedRecord?.id || ''}
              isFormEnabled={isFormEnabled}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildingAssessment;
