import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, Building2, ArrowDownUp, Hammer, ChevronDown } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getBldgAdjByTdn, BldgAdjRecord } from '@/modules/rptas/shared/services/bldgAdjService';
import { getBldgStrucByTdn, BldgStrucRecord } from '@/modules/rptas/shared/services/bldgStrucService';
import { getBuildingTypes, getBuildingAppraisals, BuildingType, BuildingAppraisal } from '@/modules/rptas/shared/services/buildingService';
import { RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';
import BuildingStructureModal from './rpt_m_BuildingStructureModal';
import BuildingAdjustmentModal from './rpt_m_BuildingAdjustmentModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/rptas/ui/select";

// Types
interface BuildingRecord {
  id: string;
  uniqueId: string;
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

interface BuildingAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
  onUpdate?: (records: any[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onRefresh?: () => void;
  status?: string;
  transactionCode?: string;
}

interface BuildingAssessmentFormData {
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

const defaultFormData: BuildingAssessmentFormData = {
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

const BuildingAssessment: React.FC<BuildingAssessmentProps> = ({ 
  records: apiRecords, 
  isEnabled = true, 
  onUpdate, 
  onEditModeChange,
  onRefresh,
  status,
  transactionCode,
}) => {
  // State for records table
  const [records, setRecords] = useState<BuildingRecord[]>([]);
  const { showConfirm } = useAlert();
  const [selectedRecord, setSelectedRecord] = useState<BuildingRecord | null>(null);
  const [formData, setFormData] = useState<BuildingAssessmentFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (apiRecords) {
      const mapped = apiRecords.map((r, index) => ({
        id: r.TDN,
        uniqueId: `${r.TDN}-${r.KIND}-${index}`, // Add a truly unique key for rendering
        kind: r.KIND,
        classification: r.CLASSIFICATION,
        actualUse: r.ACTUAL_USE || '',
        subClass: r.SUB_CLASS || '',
        area: r.AREA || 0,
        unitValue: r.UNIT_VALUE || 0,
        baseMarketValue: (r.STRUCTURE_MARKET_VAL ?? r.MARKET_VAL) || 0,
        adjustedMarketValue: (r.STRUCTURE_MARKET_VAL ?? r.MARKET_VAL) || 0,
        assessmentLevel: r.ASS_LEVEL || 0,
        assessedValue: r.ASS_VALUE || 0,
        taxable: r.TAXABLE_RATE > 0, // Simplified logic
        beneficialUse: false, // Default
        idleLand: r.IdleLand || false,
      }));
      setRecords(mapped);
    }
  }, [apiRecords]);

  useEffect(() => {
    if (isEditing || isAdding) return;
    if (selectedRecord) return;
    if (records.length === 0) return;
    const first = records[0];
    setSelectedRecord(first);
    setFormData({
      classification: first.classification,
      actualUse: first.actualUse,
      subClass: first.subClass,
      area: first.area.toString(),
      unitValue: first.unitValue.toString(),
      assessmentLevel: first.assessmentLevel.toString(),
      taxable: first.taxable,
      beneficialUse: first.beneficialUse,
      idleLand: first.idleLand,
    });
  }, [records, isAdding, isEditing, selectedRecord]);

  // Sync edit mode with parent
  useEffect(() => {
    onEditModeChange?.(isEditing || isAdding);
  }, [isEditing, isAdding, onEditModeChange]);

  const [adjustments, setAdjustments] = useState<BldgAdjRecord[]>([]);
  const [structures, setStructures] = useState<BldgStrucRecord[]>([]);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  // Dynamic Options State
  const [buildingTypes, setBuildingTypes] = useState<BuildingType[]>([]);
  const [appraisals, setAppraisals] = useState<BuildingAppraisal[]>([]);
  const [structureClasses, setStructureClasses] = useState<string[]>([]);
  const [subClasses, setSubClasses] = useState<string[]>([]);

  // Load Building Types on Mount
  useEffect(() => {
    getBuildingTypes()
      .then(setBuildingTypes)
      .catch(err => console.error('Failed to load building types', err));
  }, []);

  const effectiveBuildingTypes = useMemo(() => {
    const current = String(formData.classification || '').trim();
    if (!current) return buildingTypes;
    const has = (buildingTypes || []).some((bt) => String(bt.code || '').trim() === current);
    if (has) return buildingTypes;
    return [{ id: `__current__${current}`, code: current, name: current } as any, ...(buildingTypes || [])];
  }, [buildingTypes, formData.classification]);

  const effectiveStructureClasses = useMemo(() => {
    const current = String(formData.actualUse || '').trim();
    if (!current) return structureClasses;
    const has = (structureClasses || []).some((sc) => String(sc || '').trim() === current);
    if (has) return structureClasses;
    return [current, ...(structureClasses || [])];
  }, [formData.actualUse, structureClasses]);

  const effectiveSubClasses = useMemo(() => {
    const current = String(formData.subClass || '').trim();
    if (!current) return subClasses;
    const has = (subClasses || []).some((sc) => String(sc || '').trim() === current);
    if (has) return subClasses;
    return [current, ...(subClasses || [])];
  }, [formData.subClass, subClasses]);

  // Load Appraisals when Classification (Building Type) changes
  useEffect(() => {
    if (formData.classification) {
      getBuildingAppraisals({ classificationCode: formData.classification })
        .then(data => {
          setAppraisals(data);
          // Derive structure classes (unique)
          const uniqueStructures = Array.from(new Set(data.map(a => a.buildingType.trim()))).sort();
          setStructureClasses(uniqueStructures);
        })
        .catch(err => console.error('Failed to load appraisals', err));
    } else {
      setAppraisals([]);
      setStructureClasses([]);
    }
  }, [formData.classification]);

  // Update SubClasses when Actual Use (Structure Class) changes
  useEffect(() => {
    if (formData.actualUse && appraisals.length > 0) {
      const filtered = appraisals.filter(a => a.buildingType.trim() === formData.actualUse.trim());
      const uniqueSubClasses = Array.from(new Set(filtered.map(a => (a.buildingSubClass || 'NONE').trim()))).sort();
      setSubClasses(uniqueSubClasses);
    } else {
      setSubClasses([]);
    }
  }, [formData.actualUse, appraisals]);

  // Update Unit Value when SubClass changes
  useEffect(() => {
    if (formData.classification && formData.actualUse && formData.subClass) {
       // Find matching appraisal
       const match = appraisals.find(a => 
         a.buildingType.trim() === formData.actualUse.trim() && 
         ((a.buildingSubClass || 'NONE').trim() === formData.subClass.trim())
       );
       
       if (match) {
         setFormData(prev => ({
           ...prev,
           unitValue: match.rate.toString()
         }));
       }
    }
  }, [formData.classification, formData.actualUse, formData.subClass, appraisals]);

  const handleStructureUpdate = (updatedStructures: BldgStrucRecord[]) => {
    setStructures(updatedStructures);
    
    // Sync structure values to main form if a structure exists
    if (updatedStructures.length > 0) {
      const totals = updatedStructures.reduce(
        (acc, s) => {
          const area = Number(s.Floor_area || (s as any).Total_Area || 0);
          const unitValue = Number(s.UNIT_VALUE || 0);
          const marketVal = Number(((s as any).Market_Val ?? (area * unitValue)) || 0);
          acc.area += area;
          acc.market += marketVal;
          return acc;
        },
        { area: 0, market: 0 }
      );
      const newArea = totals.area;
      const inferredUnitValue =
        newArea > 0 ? totals.market / newArea : Number(selectedRecord?.unitValue || 0);
      
      // Update FormData (for display and computed values)
      // Map structure fields to assessment fields:
      // classification -> Classification
      // actualUse -> Struc_type (Structural Type)
      // subClass -> SubClass
      setFormData(prev => ({
        ...prev,
        area: newArea.toString(),
        unitValue: inferredUnitValue ? inferredUnitValue.toFixed(2) : prev.unitValue,
      }));

      // Update Selected Record and Records Array (to persist changes locally and avoid revert on Cancel)
      if (selectedRecord) {
        const baseMarketValue = totals.market;
        const adjustedMarketValue = baseMarketValue * (selectedRecord.assessmentLevel / 100);
        const assessedValue = adjustedMarketValue; // Simplified logic matches existing code

        const updatedRecord = {
          ...selectedRecord,
          area: newArea,
          unitValue: inferredUnitValue,
          baseMarketValue,
          adjustedMarketValue,
          assessedValue,
        };

        setSelectedRecord(updatedRecord);
        const newRecords = records.map(r => r.uniqueId === selectedRecord.uniqueId ? updatedRecord : r);
        setRecords(newRecords);
        if (onUpdate) onUpdate(newRecords);
      }
    }
  };

  // Load adjustments and structures when record is selected
  useEffect(() => {
    if (selectedRecord && selectedRecord.id) {
      // Clear existing data before fetching new to show loading state if desired
      setAdjustments([]);
      setStructures([]);
      
      getBldgStrucByTdn(selectedRecord.id)
        .then(data => {
          // Filter structures to match the selected assessment record's properties
          // This handles cases where multiple assessments share the same TDN but differ in Classification/Actual Use
          const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();
          const targetClassification = norm(selectedRecord.classification);
          const targetActualUse = norm(selectedRecord.actualUse);
          const targetSubClass = norm(selectedRecord.subClass);

          const filteredStructures = data.filter((s) => {
            const clsOk = !targetClassification || norm(s.Classification) === targetClassification;
            const useOk = !targetActualUse || norm((s as any).Actual_use) === targetActualUse;
            const subOk =
              !targetSubClass ||
              norm((s as any).SubClass) === targetSubClass ||
              norm((s as any).Sub_Class) === targetSubClass;
            return clsOk && useOk && subOk;
          });

          const finalStructures = filteredStructures.length > 0 ? filteredStructures : data;
          setStructures(finalStructures);
          
          // Get the valid BldgCodes from the filtered structures to filter adjustments
          const validBldgCodes = finalStructures.map(s => s.BldgCode).filter(Boolean);
          
          // Now fetch and filter adjustments
          getBldgAdjByTdn(selectedRecord.id)
            .then(adjData => {
              // Filter adjustments that belong to the visible structures
              const filteredAdjustments = adjData.filter(a => 
                validBldgCodes.includes(a.BldgCode)
              );
              setAdjustments(filteredAdjustments);
            })
            .catch(err => console.error('Error fetching adjustments:', err));
        })
        .catch(err => console.error('Error fetching structures:', err));
    } else {
      setAdjustments([]);
      setStructures([]);
    }
  }, [selectedRecord?.id, selectedRecord?.classification, selectedRecord?.actualUse]);

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
    
    // Fetch related data (structures and adjustments)
    // The useEffect above will handle the actual fetching based on selectedRecord change
    // But we can also set loading states here if needed in future
    
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
    // Clear sub-lists for new record
    setAdjustments([]);
    setStructures([]);
  };

  // Handle Edit
  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedRecord) return;
    const isConfirmed = await showConfirm({
      title: 'Delete Building Record',
      message: 'Are you sure you want to delete this record?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      // In a real app, this would call an API
      const newRecords = records.filter(r => r.uniqueId !== selectedRecord.uniqueId);
      setRecords(newRecords);
      if (onUpdate) onUpdate(newRecords);
      setSelectedRecord(null);
      setFormData(defaultFormData);
      setAdjustments([]);
      setStructures([]);
    }
  };

  // Handle Save
  const handleSave = () => {
    const newRecord: BuildingRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      uniqueId: isAdding ? `${Date.now()}-Building-new` : selectedRecord!.uniqueId,
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

    let newRecords: BuildingRecord[] = [];
    if (isAdding) {
      newRecords = [...records, newRecord];
    } else {
      newRecords = records.map(r => r.uniqueId === selectedRecord!.uniqueId ? newRecord : r);
    }
    setRecords(newRecords);
    if (onUpdate) onUpdate(newRecords);

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
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    setIsEditing(false);
    setIsAdding(false);
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
  const isStandardRevision = String(transactionCode || '').trim().toUpperCase() === 'REV';

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border" data-testid="building-assessment">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-surface" />
          <h2 className="text-base font-semibold text-surface">Building Assessment</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-transparent border-b border-border dark:border-border px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleAdd}
            disabled={!canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="add-building-btn"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="edit-building-btn"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-danger/10 dark:hover:bg-red-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-danger dark:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="delete-building-btn"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={handleSave}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-building-btn"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-building-btn"
          >
            <X size={14} />
            Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="refresh-building-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            disabled={status !== 'approved'}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="print-building-btn"
            title={status !== 'approved' ? "Only approved records can be printed" : "Print Record"}
          >
            <Printer size={14} />
            Print
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={() => setIsStructureOpen(true)}
            disabled={!selectedRecord}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Hammer size={14} />
            Structure
          </button>
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            disabled={!selectedRecord || isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-warning/10 dark:hover:bg-orange-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-warning dark:text-warning disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownUp size={14} />
            Adjustment
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="building-records-table">
          <thead
            className="text-surface bg-primary"
          >
            <tr className="bg-primary text-surface">
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
                <td colSpan={11} className="px-4 py-8 text-center text-muted dark:text-muted">
                  No building records. Click "Add" to create one.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                (() => {
                  const isSelected = selectedRecord?.uniqueId === record.uniqueId;
                  const zebraBg =
                    index % 2 === 0 ? 'bg-primary/10 dark:bg-background/50' : 'bg-surface dark:bg-surface';
                  const selectedBg = 'bg-emerald-50 dark:bg-emerald-900/20';
                  const rowBg = isSelected ? selectedBg : zebraBg;
                  const hoverBg = !isSelected ? 'hover:bg-primary/20 dark:hover:bg-primary/30' : '';
                  const indicator = isSelected
                    ? 'border-emerald-500 dark:border-emerald-400'
                    : 'border-transparent';

                  return (
                <tr
                  key={record.uniqueId || record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${rowBg} ${hoverBg}`}
                  data-testid={`building-row-${record.id}`}
                >
                  <td className={`px-2 py-1.5 border-r border-border dark:border-border border-l-4 ${indicator}`}>{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-border dark:border-border">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-border dark:border-border">{record.actualUse}</td>
                  <td className="px-2 py-1.5 border-r border-border dark:border-border">{record.subClass}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{formatCurrency(record.area)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{formatCurrency(record.unitValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{formatCurrency(record.baseMarketValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{formatCurrency(record.adjustedMarketValue)}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{record.assessmentLevel}%</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">{formatCurrency(record.assessedValue)}</td>
                  <td className="px-2 py-1.5 text-center">{record.taxable ? 'Taxable' : 'Exempt'}</td>
                </tr>
                  );
                })()
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Total Assessment Summary */}
      <div className="bg-muted/10 dark:bg-background border-t border-border dark:border-border px-4 py-3 rounded-b-lg">
        <div className="flex justify-end gap-8 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-muted dark:text-muted text-xs">Total Base Market Value</span>
            <span className="font-bold text-foreground dark:text-surface">
              {formatCurrency(records.reduce((sum, r) => sum + (r.baseMarketValue || 0), 0))}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted dark:text-muted text-xs">Total Adjusted Market Value</span>
            <span className="font-bold text-foreground dark:text-surface">
              {formatCurrency(records.reduce((sum, r) => sum + (r.adjustedMarketValue || 0), 0))}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted dark:text-muted text-xs">Total Assessed Value</span>
            <span className="font-bold text-primary dark:text-primary text-base">
              {formatCurrency(records.reduce((sum, r) => sum + (r.assessedValue || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BuildingStructureModal
        open={isStructureOpen}
        onOpenChange={setIsStructureOpen}
        buildingId={selectedRecord?.id || ''}
        isFormEnabled={isFormEnabled}
        initialStructures={structures}
        onUpdate={handleStructureUpdate}
        parentClassification={formData.classification}
        parentStructureType={formData.actualUse}
        parentSubType={formData.subClass}
        parentArea={formData.area}
        parentUnitValue={formData.unitValue}
      />
      <BuildingAdjustmentModal
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        buildingId={selectedRecord?.id || ''}
        isFormEnabled={true} 
        initialAdjustments={adjustments}
        structures={structures}
        onUpdate={setAdjustments}
      />

      {/* Form Section */}
      <div className="border-t border-border dark:border-border p-4 bg-background dark:bg-background/50 rounded-b-lg mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            {isStandardRevision ? (
              <div className="rounded-lg border border-border bg-surface dark:bg-muted/20 px-3 py-2 text-[11px] text-muted dark:text-muted">
                Revision: Only Unit Value and Assessment Level are editable. Classification and structural fields are read-only (MSSQL).
              </div>
            ) : null}
            {/* Classification */}
            <div className="flex items-center gap-2 relative">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Classification:
              </label>
              
              {/* Custom Dropdown Container */}
              <div className="flex-1 relative min-w-0">
                <Select
                  value={formData.classification}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, classification: value }))}
                  disabled={!isFormEnabled || isStandardRevision}
                >
                  <SelectTrigger 
                    className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    data-testid="input-classification"
                  >
                    <span className="truncate">
                      {formData.classification ? formData.classification : "Select Classification"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {effectiveBuildingTypes.map((bt) => (
                      <SelectItem key={bt.id} value={bt.code} className="text-xs">
                        {bt.code} - {bt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actual Use (Renamed to Structural Type) */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Structural Type:
              </label>
              <div className="flex-1 relative min-w-0">
                <Select
                  value={formData.actualUse}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, actualUse: value }))}
                  disabled={!isFormEnabled || isStandardRevision}
                >
                  <SelectTrigger 
                    className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    data-testid="input-actual-use"
                  >
                    <SelectValue placeholder="Select Structural Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {effectiveStructureClasses.map((sc, index) => (
                      <SelectItem key={`${sc}-${index}`} value={sc} className="text-xs">
                        {sc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub Class (Renamed to Sub Type) */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Sub Type:
              </label>
              <div className="flex-1 relative min-w-0">
                <Select
                  value={formData.subClass}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subClass: value }))}
                  disabled={!isFormEnabled || isStandardRevision}
                >
                  <SelectTrigger 
                    className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    data-testid="input-sub-class"
                  >
                    <SelectValue placeholder="Select Sub Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {effectiveSubClasses.map((sub, index) => (
                      <SelectItem key={`${sub}-${index}`} value={sub} className="text-xs">
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Area */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Area:
              </label>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  disabled={!isFormEnabled || isStandardRevision}
                  placeholder="0.00"
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-area"
                />
                <span className="text-xs text-muted dark:text-muted w-12">sq.m.</span>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-3">
            {/* Unit Value */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-foreground dark:text-foreground text-right">
                Unit Value:
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitValue}
                onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))}
                disabled={!isFormEnabled}
                placeholder="0.00"
                className="flex-1 px-2 py-1.5 text-xs text-right bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-unit-value"
              />
            </div>

            {/* Base Market Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-foreground dark:text-foreground text-right">
                Base Market Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.baseMarketValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded cursor-not-allowed"
                data-testid="display-base-market-value"
              />
            </div>

            {/* Adjusted Market Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-foreground dark:text-foreground text-right">
                Adjusted Market Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.adjustedMarketValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded cursor-not-allowed"
                data-testid="display-adjusted-market-value"
              />
            </div>

            {/* Assessment Level */}
            <div className="flex items-center gap-2">
              <label className="w-36 text-xs font-medium text-foreground dark:text-foreground text-right">
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
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-assessment-level"
                />
                <span className="text-xs text-muted dark:text-muted w-4">%</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Assessed Value (readonly) */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Assessed Value:
              </label>
              <input
                type="text"
                value={formatCurrency(computedValues.assessedValue)}
                readOnly
                className="flex-1 px-2 py-1.5 text-xs text-right bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded cursor-not-allowed font-medium"
                data-testid="display-assessed-value"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Taxable:
              </label>
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))}
                disabled={!isFormEnabled || isStandardRevision}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-taxable"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Beneficial Use:
              </label>
              <input
                type="checkbox"
                checked={formData.beneficialUse}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficialUse: e.target.checked }))}
                disabled={!isFormEnabled || isStandardRevision}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-beneficial-use"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Idle Land:
              </label>
              <input
                type="checkbox"
                checked={formData.idleLand}
                onChange={(e) => setFormData(prev => ({ ...prev, idleLand: e.target.checked }))}
                disabled={!isFormEnabled || isStandardRevision}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="checkbox-idle-land"
              />
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default BuildingAssessment;
