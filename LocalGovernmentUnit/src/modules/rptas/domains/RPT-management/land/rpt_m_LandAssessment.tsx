import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, TreePine, ArrowDownUp, Trees, Loader2 } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';
import type { Municipality } from '@/services/landTaxService';
import { getCities } from '@/modules/rptas/shared/services/cityService';
import LandAdjustmentModal, { LandAdjustment } from './rpt_m_LandAdjustmentModal';
import TreesModal, { TreePlant } from './rpt_m_TreesModal';
import MainClassSelect from '@/modules/rptas/shared/components/data-entry/MainClassSelect';
import { useMainClassOptions } from '@/modules/rptas/shared/components/data-entry/useMainClassOptions';
import { useConfiguredMainClassOptions } from '@/modules/rptas/shared/components/data-entry/useConfiguredMainClassOptions';
import ActualUseSelect from '@/modules/rptas/shared/components/data-entry/ActualUseSelect';
import { useActualUseOptions } from '@/modules/rptas/shared/components/data-entry/useActualUseOptions';
import { useAssignedActualUseOptions } from '@/modules/rptas/shared/components/data-entry/useAssignedActualUseOptions';
import MunicipalityDropdown from '@/modules/rptas/shared/components/data-entry/MunicipalityDropdown';
import { toast } from 'sonner';
import { ActualUseRate, getActualUseRates } from '@/modules/rptas/shared/services/actualUseRateService';
import { useActualUseOrdinances } from '../queries/actualUseOrdinancesQuery';
import { getAssessmentRevisionPermissions } from '@/modules/rptas/shared/utils/revisionRules';

interface LandAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
  onUpdate?: (records: any[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onRefresh?: () => void;
  status?: string;
  transactionCode?: string;
  dataSource?: 'mssql' | 'supabase';
}

interface LandAssessmentRecord {
  id: string;
  uniqueId?: string;
  tdn?: string;
  kind: string;
  classification: string;
  subClass: string;
  classLevel?: string;
  municipality?: string;
  ordinanceNo?: string;
  ordinanceDateApproved?: string;
  city?: string;
  prov?: string;
  region?: string;
  district?: string;
  actualUse: string;
  area: number;
  ifDefault: boolean;
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

interface LandAssessmentFormData {
  classification: string;
  subClass: string;
  classLevel: string;
  municipality: string;
  actualUse: string;
  area: string;
  ifDefault: boolean;
  unitValue: string;
  assessmentLevel: string;
  taxable: boolean;
  beneficialUse: boolean;
  idleLand: boolean;
}

const normalizeClassLevel = (value: unknown): string => {
  const v = String(value || '').trim();
  if (v === '1' || v.toLowerCase() === '1st') return '1';
  if (v === '2' || v.toLowerCase() === '2nd') return '2';
  if (v === '3' || v.toLowerCase() === '3rd') return '3';
  if (v === '4' || v.toLowerCase() === '4th') return '4';
  return '1';
};

const normalizeIfDefault = (value: unknown): boolean => {
  if (value === false) return false;
  if (value === 0) return false;
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;
  if (v === '') return true;
  return Boolean(value);
};


const defaultFormData: LandAssessmentFormData = {
  classification: '',
  subClass: '',
  classLevel: '1',
  municipality: '',
  actualUse: '',
  area: '',
  ifDefault: true, // Default to true (Hectares)
  unitValue: '',
  assessmentLevel: '',
  taxable: true,
  beneficialUse: false,
  idleLand: false,
};

const LandAssessment: React.FC<LandAssessmentProps> = ({ 
  records: apiRecords, 
  isEnabled = true, 
  onUpdate, 
  onEditModeChange,
  onRefresh,
  status,
  transactionCode,
  dataSource = 'mssql',
}) => {
  const { showConfirm } = useAlert();
  const [records, setRecords] = useState<LandAssessmentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LandAssessmentRecord | null>(null);
  const [selectedTdn, setSelectedTdn] = useState<string>(''); // Store TDN for trees modal
  const [formData, setFormData] = useState<LandAssessmentFormData>(defaultFormData);
  const [ordinanceNo, setOrdinanceNo] = useState('');
  const isStandardRevision = String(transactionCode || '').trim().toUpperCase() === 'REV';
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { options: mainClassOptions, isLoading: isMainClassLoading } = useMainClassOptions();
  const { options: configuredMainClassOptions, isLoading: isLoadingConfiguredMainClasses } = useConfiguredMainClassOptions(
    formData.municipality,
    formData.classLevel,
    ordinanceNo
  );
  const isSetupContextComplete = Boolean(formData.municipality && formData.classLevel && ordinanceNo);
  const activeMainClassOptions = isSetupContextComplete ? configuredMainClassOptions : mainClassOptions;

  const { options: fallbackActualUseOptions, isLoading: isLoadingActualUses } = useActualUseOptions(formData.classification);
  const { options: assignedActualUseOptions, isLoading: isLoadingAssignedActualUses } =
    useAssignedActualUseOptions({
      municipalityCode: formData.municipality,
      classLevel: formData.classLevel,
      mainClassCode: formData.classification,
      ordinanceNo,
    });
  const activeActualUseOptions = isSetupContextComplete ? assignedActualUseOptions : fallbackActualUseOptions;

  const isMainClassValidInContext = !isSetupContextComplete
    ? true
    : configuredMainClassOptions.some((o) => o.code === String(formData.classification || '').trim().toUpperCase());
  const isActualUseValidInContext = !isSetupContextComplete
    ? true
    : assignedActualUseOptions.some((o) => o.code === String(formData.actualUse || '').trim().toUpperCase());
  const revisionPermissions = getAssessmentRevisionPermissions({
    transactionCode,
    dataSource,
    isContextComplete: isSetupContextComplete,
    isMainClassValidInContext,
    isActualUseValidInContext,
  });
  const hasRevisionInputError = revisionPermissions.hasErrorInput;
  const canEditContext = revisionPermissions.canEditContext;
  const isMainClassLocked = !revisionPermissions.canEditMainClass;
  const isActualUseLocked = !revisionPermissions.canEditActualUse;
  const [actualUseRates, setActualUseRates] = useState<ActualUseRate[]>([]);
  const [isRatesLoaded, setIsRatesLoaded] = useState(false);

  useEffect(() => {
    setIsRatesLoaded(false);
    setActualUseRates([]);
  }, [formData.classLevel, formData.municipality, ordinanceNo, formData.classification]);

  // Sync edit mode with parent
  useEffect(() => {
    onEditModeChange?.(isEditing || isAdding);
  }, [isEditing, isAdding, onEditModeChange]);

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTreesOpen, setIsTreesOpen] = useState(false);
  const [isLoadingUnitValue, setIsLoadingUnitValue] = useState(false);
  
  // Dynamic Options State
  const [municipalityOptions, setMunicipalityOptions] = useState<Municipality[]>([]);
  const { data: ordinances = [], isError: isOrdinancesError } = useActualUseOrdinances();

  // Load Initial Data
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const all: Array<{ CODE: string; DESCRIPTION: string }> = [];
        let page = 1;
        let totalPages = 1;
        const pageSize = 500;
        while (page <= totalPages) {
          const res = await getCities(page, pageSize);
          all.push(...(res.data || []));
          totalPages = res.meta?.totalPages || 1;
          page += 1;
        }

        const mapped: Municipality[] = Array.from(
          new Map(
            all.map((c) => [
              String(c.CODE || '').trim(),
              { code: String(c.CODE || '').trim(), name: String(c.DESCRIPTION || '').trim() },
            ])
          ).values()
        )
          .filter((m) => m.code)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!alive) return;
        setMunicipalityOptions(mapped);
      } catch (err) {
        if (!alive) return;
        setMunicipalityOptions([]);
        console.error('Failed to load municipalities', err);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);
  
  useEffect(() => {
    if (isOrdinancesError) toast.error('Failed to load ordinances.');
  }, [isOrdinancesError]);

  const eligibleOrdinances = (ordinances || [])
    .filter((o) => {
      const muni = String(formData.municipality || '').trim().toUpperCase();
      const levelRaw = String(formData.classLevel || '').trim();
      const level = levelRaw ? normalizeClassLevel(levelRaw) : '';
      const omRaw = String(o.municipality_code || '').trim();
      const olRaw = String(o.class_level || '').trim();
      const om = omRaw.toUpperCase();
      const ol = olRaw.toUpperCase();
      const muniOk = !muni || om === 'ALL' || om === muni;
      const levelOk = !level || ol === 'ALL' || normalizeClassLevel(olRaw) === level;
      return muniOk && levelOk;
    })
    .reduce((acc, o) => {
      const key = `${String(o.ordinance_no || '').trim()}|${String(o.date_approved || '').trim().slice(0, 10)}`;
      if (!acc.some((x) => x.key === key)) acc.push({ key, o });
      return acc;
    }, [] as Array<{ key: string; o: any }>)
    .map((x) => x.o)
    .sort((a, b) => String(b.date_approved || '').localeCompare(String(a.date_approved || '')));

  useEffect(() => {
    if (!ordinanceNo) return;
    if (eligibleOrdinances.length === 0) return;
    const exists = eligibleOrdinances.some((o) => String(o.ordinance_no) === String(ordinanceNo));
    if (!exists) setOrdinanceNo('');
  }, [eligibleOrdinances, ordinanceNo]);

  // Load SubClasses removed as it's now an auto-generated input field
  /*
  useEffect(() => {
    if (formData.classification) {
      getLandSubClasses(formData.classification)
        .then(setSubClassOptions)
        .catch(err => console.error('Failed to load subclasses', err));
    } else {
      setSubClassOptions([]);
    }
  }, [formData.classification]);
  */

  // Auto-generate Sub Class based on Classification and Class Level (Client-side logic as requested)
  useEffect(() => {
    if (isStandardRevision) return;
    if (formData.classification && formData.classLevel) {
      const autoSubClass = `${formData.classification}-${formData.classLevel}`;
      
      setFormData(prev => ({ ...prev, subClass: autoSubClass }));
    }
  }, [formData.classification, formData.classLevel, isStandardRevision]);
  
  // Fetch Unit Value from Actual Use Rate (saved in Main Class Setup)
  useEffect(() => {
    const main = String(formData.classification || '').trim().toUpperCase();
    const actualUse = String(formData.actualUse || '').trim().toUpperCase();
    if (!isSetupContextComplete) return;
    if (!main || !actualUse) {
      setFormData((prev) => ({ ...prev, unitValue: '0' }));
      return;
    }

    let alive = true;
    const loadAndApply = async () => {
      setIsLoadingUnitValue(true);
      try {
        let rates = actualUseRates;
        if (!isRatesLoaded) {
          rates = await getActualUseRates({
            municipalityCode: formData.municipality,
            classLevel: formData.classLevel,
            ordinanceNo,
            mainClassCode: main,
          });
          if (!alive) return;
          setActualUseRates(rates || []);
          setIsRatesLoaded(true);
        }

        const match = (rates || []).find(
          (r) =>
            String(r.mainclass_code || '').trim().toUpperCase() === main &&
            String(r.actualuse_code || '').trim().toUpperCase() === actualUse
        );

        if (match && match.rate !== null && match.rate !== undefined) {
          const perHa = Number(match.rate);
          const unit = formData.ifDefault ? perHa : perHa / 10000;
          setFormData((prev) => ({ ...prev, unitValue: Number.isFinite(unit) ? String(unit) : '0' }));
        } else {
          setFormData((prev) => ({ ...prev, unitValue: '0' }));
        }
      } catch (err) {
        console.error('Failed to fetch actual use rates', err);
      } finally {
        if (alive) setIsLoadingUnitValue(false);
      }
    };

    loadAndApply();
    return () => {
      alive = false;
    };
  }, [
    actualUseRates,
    assignedActualUseOptions.length,
    configuredMainClassOptions.length,
    formData.actualUse,
    formData.classification,
    formData.ifDefault,
    isRatesLoaded,
    isSetupContextComplete,
  ]);

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
        uniqueId: r.TDN + '-' + index, // Stable key for rendering
        tdn: r.TDN,
        kind: r.KIND,
        classification: r.CLASSIFICATION,
        subClass: r.SUB_CLASS || '',
        classLevel: normalizeClassLevel((r as any).CLASS_LEVEL), // Try to get from API or default
        municipality: (r as any).MUNICIPALITY || 'Buenavista', // Try to get from API or default
        ordinanceNo: String((r as any).ORDINANCE_NO ?? (r as any).ordinanceNo ?? ''),
        ordinanceDateApproved: String((r as any).ORDINANCE_DATE_APPROVED ?? (r as any).ordinanceDateApproved ?? ''),
        city: r.CITY,
        prov: r.PROV,
        region: r.REGION,
        district: r.DISTRICT,
        actualUse: r.ACTUAL_USE || '',
        area: r.AREA || 0,
        ifDefault: normalizeIfDefault(r.IF_DEFAULT),
        unitValue: r.UNIT_VALUE || 0,
        baseMarketValue: r.MARKET_VAL || 0,
        adjustedMarketValue: r.MARKET_VAL || 0, // Using same value for now as API might not provide split
        assessmentLevel: r.ASS_LEVEL || 0,
        assessedValue: r.ASS_VALUE || 0,
        taxable: r.TAXABILITY === 'true' || r.TAXABILITY === 'TAXABLE' || r.TAXABLE_RATE > 0, // Handle boolean or string
        beneficialUse: r.BU === 'true' || r.BU === '1', // Handle boolean or string representation
        idleLand: r.IdleLand || false,
        adjustments: (r as any).adjustments || [],
        trees: (r as any).trees || [], // Explicitly ensure trees are mapped
      }));
      setRecords(mapped);
      
      // If we have a selected record, we need to update it with the new data from apiRecords
      // Otherwise, the modal will open with old data
      if (selectedRecord) {
        const updatedSelected = mapped.find(r => r.id === selectedRecord.id);
        if (updatedSelected) {
            setSelectedRecord(updatedSelected);
        }
      }
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
    const totalAdjustment = currentAdjustments.reduce((sum: number, a: LandAdjustment) => {
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
  const handleRowSelect = (record: LandAssessmentRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setSelectedTdn(record.tdn || '');
    setOrdinanceNo(String(record.ordinanceNo || '').trim());
    const municipalityValue = (() => {
      const current = String(record.municipality || '').trim();
      if (!current) return '';
      const match =
        municipalityOptions.find((m) => m.code === current) ||
        municipalityOptions.find((m) => m.name.toLowerCase() === current.toLowerCase());
      return match?.code || current;
    })();
      setFormData({
      classification: record.classification,
      actualUse: record.actualUse,
      subClass: record.subClass,
      classLevel: normalizeClassLevel(record.classLevel),
      municipality: municipalityValue,
      area: record.area.toString(),
      ifDefault: record.ifDefault,
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
    setOrdinanceNo('');
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
      title: 'Delete Land Record',
      message: 'Are you sure you want to delete this land record?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      const newRecords = records.filter(r => r.id !== selectedRecord.id);
      setRecords(newRecords);
      if (onUpdate) onUpdate(newRecords);
      setSelectedRecord(null);
      setFormData(defaultFormData);
      setOrdinanceNo('');
    }
  };

  // Handle Save
  const handleSave = () => {
    // Calculate Assessed Value
    const unitVal = parseFloat(formData.unitValue) || 0;
    const areaVal = parseFloat(formData.area) || 0;
    const assLvl = parseFloat(formData.assessmentLevel) || 0;
    
    const baseMarketValue = unitVal * areaVal;
    const selectedOrd = (ordinances || []).find((o) => String(o.ordinance_no) === String(ordinanceNo));
    
    const newRecord: LandAssessmentRecord = {
      id: isAdding ? `${selectedTdn}-Land-${Date.now()}` : selectedRecord!.id,
      uniqueId: isAdding ? `${selectedTdn}-Land-${Date.now()}` : selectedRecord!.uniqueId,
      tdn: selectedTdn,
      kind: 'Land',
        classification: formData.classification,
        actualUse: formData.actualUse,
        subClass: formData.subClass,
        classLevel: formData.classLevel,
        municipality: formData.municipality,
        ordinanceNo: String(ordinanceNo || '').trim(),
        ordinanceDateApproved: selectedOrd?.date_approved ? String(selectedOrd.date_approved).slice(0, 10) : '',
        area: areaVal,
        ifDefault: formData.ifDefault,
      unitValue: unitVal,
      baseMarketValue: baseMarketValue,
      adjustedMarketValue: baseMarketValue,
      assessmentLevel: assLvl,
      assessedValue: baseMarketValue * (assLvl / 100),
      taxable: formData.taxable,
      beneficialUse: formData.beneficialUse,
      idleLand: formData.idleLand,
      adjustments: selectedRecord?.adjustments || [],
      trees: selectedRecord?.trees || [],
    };

    let newRecords: LandAssessmentRecord[] = [];
    if (isAdding) {
      newRecords = [...records, newRecord];
    } else {
      newRecords = records.map(r => r.id === selectedRecord!.id ? newRecord : r);
    }
    setRecords(newRecords);
    if (onUpdate) onUpdate(newRecords);

    setSelectedRecord(newRecord);
    setIsEditing(false);
    setIsAdding(false);
  };

  // Handle Save Adjustments
  const handleSaveAdjustments = (newAdjustments: LandAdjustment[]) => {
    if (!selectedRecord) return;
    const updatedRecord = { ...selectedRecord, adjustments: newAdjustments };
    const newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    setRecords(newRecords);
    if (onUpdate) onUpdate(newRecords);
    setSelectedRecord(updatedRecord);
  };

  // Handle Save Trees
  const handleSaveTrees = (newTrees: TreePlant[]) => {
    if (!selectedRecord) return;
    const updatedRecord = { ...selectedRecord, trees: newTrees };
    const newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    setRecords(newRecords);
    if (onUpdate) onUpdate(newRecords);
    setSelectedRecord(updatedRecord);
  };

  // Handle Cancel
  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      setOrdinanceNo(String(selectedRecord.ordinanceNo || '').trim());
      setFormData({
        classification: selectedRecord.classification,
        actualUse: selectedRecord.actualUse,
        subClass: selectedRecord.subClass,
        classLevel: normalizeClassLevel(selectedRecord.classLevel),
        municipality: selectedRecord.municipality || 'Buenavista',
        area: selectedRecord.area.toString(),
        ifDefault: selectedRecord.ifDefault,
        unitValue: selectedRecord.unitValue.toString(),
        assessmentLevel: selectedRecord.assessmentLevel.toString(),
        taxable: selectedRecord.taxable,
        beneficialUse: selectedRecord.beneficialUse,
        idleLand: selectedRecord.idleLand,
      });
    } else {
      setFormData(defaultFormData);
      setOrdinanceNo('');
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
      // Data will be updated via records prop
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

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border" data-testid="land-assessment">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        <div className="flex items-center gap-2">
          <TreePine size={20} className="text-surface" />
          <h2 className="text-base font-semibold text-surface">Land Assessment</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-transparent border-b border-border dark:border-border px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleAdd}
            disabled={!canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="add-land-btn"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="edit-land-btn"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-danger/10 dark:hover:bg-red-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-danger dark:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="delete-land-btn"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={handleSave}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-land-btn"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-land-btn"
          >
            <X size={14} />
            Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="refresh-land-btn"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            disabled={status !== 'approved'}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="print-land-btn"
            title={status !== 'approved' ? "Only approved records can be printed" : "Print Record"}
          >
            <Printer size={14} />
            Print
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-muted/30 mx-1 self-center" />
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            disabled={!selectedRecord}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-warning/10 dark:hover:bg-orange-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-warning dark:text-warning disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownUp size={14} />
            Adjustment
          </button>
          <button
            onClick={() => setIsTreesOpen(true)}
            disabled={!selectedRecord}
            className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-success/10 dark:hover:bg-green-900/20 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-success dark:text-success disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="text-surface bg-primary"
          >
            <tr className="bg-primary text-surface">
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Kind</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Class</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Actual Use</th>
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
                <td colSpan={10} className="px-4 py-8 text-center text-muted dark:text-muted">
                  No land records. Click "Add" to create one.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                (() => {
                  const isSelected = selectedRecord?.id === record.id;
                  const zebraBg =
                    index % 2 === 0 ? 'bg-success/10/30 dark:bg-background/50' : 'bg-surface dark:bg-surface';
                  const selectedBg = 'bg-emerald-50 dark:bg-emerald-900/20';
                  const rowBg = isSelected ? selectedBg : zebraBg;
                  const hoverBg = !isSelected ? 'hover:bg-success/20 dark:hover:bg-green-900/30' : '';
                  const indicator = isSelected
                    ? 'border-emerald-500 dark:border-emerald-400'
                    : 'border-transparent';

                  return (
                <tr
                  key={record.uniqueId || record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${rowBg} ${hoverBg}`}
                  data-testid={`land-row-${record.id}`}
                >
                  <td className={`px-2 py-1.5 border-r border-border dark:border-border border-l-4 ${indicator}`}>{record.kind}</td>
                  <td className="px-2 py-1.5 border-r border-border dark:border-border">{record.classification}</td>
                  <td className="px-2 py-1.5 border-r border-border dark:border-border">{record.actualUse}</td>
                  <td className="px-2 py-1.5 text-right border-r border-border dark:border-border">
                    {record.area.toFixed(4)} {record.ifDefault ? 'ha.' : 'sq.m.'}
                  </td>
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
        tdn={selectedTdn}
        readOnly={!(isEnabled || isLocalFormEnabled)}
      />


      <div className="border-t border-border dark:border-border p-4 bg-background dark:bg-background/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            {isStandardRevision ? (
              <div
                className={`rounded-lg border px-3 py-2 text-[11px] ${
                  hasRevisionInputError
                    ? 'border-warning/40 bg-warning/5 dark:bg-warning/10 text-foreground'
                    : 'border-border bg-surface dark:bg-muted/20 text-muted dark:text-muted'
                }`}
              >
                {hasRevisionInputError
                  ? 'Revision: Input error detected. Municipality, Class Level, and Ordinance are temporarily editable to fix the context.'
                  : 'Revision: Only Unit Value and Assessment Level are editable. Main Class and Actual Use are read-only (MSSQL).'}
              </div>
            ) : null}

            {/* Municipality */}
            <MunicipalityDropdown
              label="Municipality:"
              value={formData.municipality}
              options={municipalityOptions}
              onValueChange={(nextCode) => {
                setOrdinanceNo('');
                setFormData((prev) => ({
                  ...prev,
                  municipality: nextCode,
                }));
              }}
              cityInfo={{
                CITY: selectedRecord?.city,
                PROV: selectedRecord?.prov,
                REGION: selectedRecord?.region,
                DISTRICT: selectedRecord?.district,
              }}
              matchCityCode="04"
              disabled={!isFormEnabled || !canEditContext}
              data-testid="input-municipality"
            />

            {/* Class Level */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Class Level:
              </label>
              <select
                value={formData.classLevel}
                onChange={(e) => {
                  const next = e.target.value;
                  setOrdinanceNo('');
                  setFormData((prev) => ({
                    ...prev,
                    classLevel: next,
                  }));
                }}
                disabled={!isFormEnabled || !canEditContext}
                className="flex-1 px-2 py-1.5 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="1">1st Grade</option>
                <option value="2">2nd Grade</option>
                <option value="3">3rd Grade</option>
                <option value="4">4th Grade</option>
              </select>
            </div>

            {/* Ordinance */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Ordinance:
              </label>
              <div className="flex-1">
                <select
                  value={ordinanceNo}
                  onChange={(e) => {
                    const next = e.target.value;
                    setOrdinanceNo(next);
                  }}
                  disabled={!isFormEnabled || !canEditContext || !formData.municipality || !formData.classLevel}
                  className="w-full px-2 py-1.5 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-ordinance"
                >
                  <option value="">
                    Select Ordinance
                  </option>
                  {eligibleOrdinances.map((o) => (
                    <option key={o.id} value={String(o.ordinance_no)}>
                      {String(o.ordinance_no)} • {String(o.date_approved || '').slice(0, 10)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Classification */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Main Class:
              </label>
              <div className="flex-1">
                <MainClassSelect
                  label=""
                  value={formData.classification}
                  options={activeMainClassOptions}
                  allowCustomValue
                  showDescriptionInInput
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      classification: value,
                      actualUse: '',
                      subClass: '',
                    }));
                  }}
                  onInvalid={(value) => {
                    toast.error(`Invalid Main Class: ${value}`);
                  }}
                  placeholder={
                    !ordinanceNo
                      ? 'Select Ordinance first'
                      : isMainClassLoading || isLoadingConfiguredMainClasses
                        ? 'Loading...'
                        : 'Select Main Class'
                  }
                  disabled={!isFormEnabled || isMainClassLocked || !ordinanceNo || isMainClassLoading || isLoadingConfiguredMainClasses}
                  inputClassName="w-full px-2 py-1.5 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-classification"
                />
              </div>
            </div>

            {/* Actual Use */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                Actual Use:
              </label>
              <div className="flex-1">
                <ActualUseSelect
                  label=""
                  value={formData.actualUse}
                  options={activeActualUseOptions}
                  allowCustomValue
                  showDescriptionInInput
                  disabled={!isFormEnabled || isActualUseLocked || !ordinanceNo || !formData.classification || isLoadingActualUses || isLoadingAssignedActualUses}
                  placeholder={
                    !ordinanceNo
                      ? 'Select Ordinance first'
                      : !formData.classification
                        ? 'Select Main Class first'
                        : isLoadingActualUses || isLoadingAssignedActualUses
                          ? 'Loading...'
                          : 'Select Actual Use'
                  }
                  inputClassName="w-full px-2 py-1.5 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  onValueChange={(value) => setFormData(prev => ({ ...prev, actualUse: value }))}
                  onInvalid={(value) => toast.error(`Invalid actual use: ${value}`)}
                  data-testid="input-actual-use"
                />
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
                  step="0.0001"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  disabled={!isFormEnabled}
                  placeholder="0.0000"
                  className="flex-1 px-2 py-1.5 text-xs text-right bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-area"
                />
                <span className="text-xs text-muted dark:text-muted w-12">
                  <select
                    value={formData.ifDefault ? 'true' : 'false'}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifDefault: e.target.value === 'true' }))}
                    disabled={!isFormEnabled}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-muted dark:text-muted cursor-pointer"
                  >
                    <option value="true">ha.</option>
                    <option value="false">sq.m.</option>
                  </select>
                </span>
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
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))}
                  disabled={!isFormEnabled || isLoadingUnitValue}
                  placeholder="0.00"
                  className={`w-full px-2 py-1.5 text-xs text-right bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed ${isLoadingUnitValue ? 'text-muted dark:text-muted pr-7' : ''}`}
                  data-testid="input-unit-value"
                  aria-busy={isLoadingUnitValue}
                  aria-label="Unit Value"
                />
                {isLoadingUnitValue && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
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
                disabled={!isFormEnabled}
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
                disabled={!isFormEnabled}
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
                disabled={!isFormEnabled}
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

export default LandAssessment;
