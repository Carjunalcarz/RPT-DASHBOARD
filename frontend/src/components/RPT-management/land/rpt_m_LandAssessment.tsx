import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, TreePine, ArrowDownUp, Trees, Loader2 } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAlert } from '@/context/AlertContext';
import { RptAssRecord } from '@/services/rptAssService';
import { getLandClassifications, getLandMarketValues, getMunicipalities, getAgriculturalTypes, LandClassification, LandMarketValue, Municipality } from '@/services/landTaxService';
import LandAdjustmentModal, { LandAdjustment } from './rpt_m_LandAdjustmentModal';
import TreesModal, { TreePlant } from './rpt_m_TreesModal';

interface LandAssessmentProps {
  records?: RptAssRecord[];
  isEnabled?: boolean;
  onUpdate?: (records: any[]) => void;
}

interface LandRecord {
  id: string;
  uniqueId?: string;
  tdn?: string; // Add TDN field
  kind: string;
  classification: string;
  subClass: string;
  classLevel?: string; // Added
  municipality?: string; // Added
  actualUse: string;
  area: number;
  ifDefault: boolean; // Added IF_DEFAULT
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
  subClass: string;
  classLevel: string; // Added Class Level
  municipality: string; // Added Municipality
  actualUse: string; // Keep for compatibility but might be unused
  area: string;
  ifDefault: boolean; // Added IF_DEFAULT
  unitValue: string;
  assessmentLevel: string;
  taxable: boolean;
  beneficialUse: boolean;
  idleLand: boolean;
}


const defaultFormData: FormData = {
  classification: '',
  subClass: '',
  classLevel: '1st',
  municipality: 'Buenavista', // Default
  actualUse: '',
  area: '',
  ifDefault: true, // Default to true (Hectares)
  unitValue: '',
  assessmentLevel: '',
  taxable: true,
  beneficialUse: false,
  idleLand: false,
};

const LandAssessment: React.FC<LandAssessmentProps> = ({ records: apiRecords, isEnabled, onUpdate }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [selectedTdn, setSelectedTdn] = useState<string>(''); // Store TDN for trees modal
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTreesOpen, setIsTreesOpen] = useState(false);
  const [isLoadingUnitValue, setIsLoadingUnitValue] = useState(false);
  
  // Dynamic Options State
  const [classificationOptions, setClassificationOptions] = useState<LandClassification[]>([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<Municipality[]>([]);
  const [agriTypeOptions, setAgriTypeOptions] = useState<{ code: string; name: string }[]>([]);
  const [selectedAgriType, setSelectedAgriType] = useState<string>('');
  // actualUseOptions removed/deprecated

  // Load Initial Data
  useEffect(() => {
    getLandClassifications()
      .then(setClassificationOptions)
      .catch(err => console.error('Failed to load classifications', err));
      
    getMunicipalities()
      .then(setMunicipalityOptions)
      .catch(err => console.error('Failed to load municipalities', err));

    getAgriculturalTypes()
      .then(setAgriTypeOptions)
      .catch(err => console.error('Failed to load agricultural types', err));
  }, []);

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

  // Helper function to convert 1st, 2nd, etc. to Roman Numerals I, II, etc.
  const toRoman = (level: string) => {
    switch (level) {
      case '1st': return 'I';
      case '2nd': return 'II';
      case '3rd': return 'III';
      case '4th': return 'IV';
      default: return '';
    }
  };

  // Auto-generate Sub Class based on Classification and Class Level (Client-side logic as requested)
  useEffect(() => {
    // Only apply for Residential (RES), Commercial (COM), and Industrial (IND)
    const allowedClassifications = ['RES', 'COM', 'IND'];
    
    if (allowedClassifications.includes(formData.classification) && formData.classLevel) {
      // Get the first letter of the classification (R, C, I)
      const prefix = formData.classification.charAt(0);
      
      // Convert Class Level to Roman (I, II, III, IV)
      const roman = toRoman(formData.classLevel);
      
      // Construct the code: e.g., R-I, C-II, I-III
      const autoSubClass = `${prefix}-${roman}`;
      
      setFormData(prev => ({ ...prev, subClass: autoSubClass }));
    } else if (formData.classification === 'AGR' && selectedAgriType && formData.classLevel) {
      // For Agricultural: Type + Roman Numeral
      const roman = toRoman(formData.classLevel);
      const autoSubClass = `${selectedAgriType} - ${roman}`;
      setFormData(prev => ({ ...prev, subClass: autoSubClass }));
    }
  }, [formData.classification, formData.classLevel, selectedAgriType]);
  
  // Fetch Unit Value when Municipality, SubClass, or Class Level changes
  useEffect(() => {
    // Only fetch if we have a valid subclass (either selected from options or auto-generated)
    // Note: If auto-generated 'R-I' doesn't exist in DB, it might return empty or error.
    // We should probably rely on the manual selection if auto-generation isn't strict.
    // But let's try to fetch.
    if (formData.municipality && formData.subClass && formData.classLevel && formData.classification) {
        setIsLoadingUnitValue(true);
        
        // For AGR, we need to pass the base type (selectedAgriType) as subClassCode, not the concatenated string
        const subClassCode = formData.classification === 'AGR' ? selectedAgriType : formData.subClass;
        
        getLandMarketValues({
            municipalityName: formData.municipality,
            subClassCode: subClassCode,
            classificationCode: formData.classification
        }).then(values => {
            // Find value matching class level
            const match = values.find(v => v.classLevel === formData.classLevel);
            if (match) {
                setFormData(prev => ({
                    ...prev,
                    unitValue: match.rate.toString()
                }));
            } else {
                // Optional: clear or leave existing value if not found
            }
        }).catch(err => {
            console.error('Failed to fetch market value', err);
        }).finally(() => {
            setIsLoadingUnitValue(false);
        });
    }
  }, [formData.municipality, formData.subClass, formData.classLevel, formData.classification]);

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
        uniqueId: `${r.TDN}-Land-${index}-${Date.now()}`, // Add a truly unique key for rendering
        tdn: r.TDN,
        kind: r.KIND,
        classification: r.CLASSIFICATION,
        subClass: r.SUB_CLASS || '',
        classLevel: (r as any).CLASS_LEVEL || '1st', // Try to get from API or default
        municipality: (r as any).MUNICIPALITY || 'Buenavista', // Try to get from API or default
        actualUse: r.ACTUAL_USE || '', 
        area: r.AREA || 0,
        ifDefault: r.IF_DEFAULT !== false, // Default to true if undefined
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
        const updatedSelected = mapped.find(r => r.id === selectedRecord.id || r.tdn === selectedRecord.tdn);
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
      classLevel: record.classLevel || '1st',
      municipality: record.municipality || 'Buenavista',
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
    }
  };

  // Handle Save
  const handleSave = () => {
    // Calculate Assessed Value
    const unitVal = parseFloat(formData.unitValue) || 0;
    const areaVal = parseFloat(formData.area) || 0;
    const assLvl = parseFloat(formData.assessmentLevel) || 0;
    
    const baseMarketValue = unitVal * areaVal;
    
    const newRecord: LandRecord = {
      id: isAdding ? `${selectedTdn}-Land-${Date.now()}` : selectedRecord!.id,
      uniqueId: selectedRecord?.uniqueId || `${selectedTdn}-Land-${Date.now()}-${Math.random()}`,
      tdn: selectedTdn,
      kind: 'Land',
        classification: formData.classification,
        actualUse: formData.subClass, 
        subClass: formData.subClass,
        classLevel: formData.classLevel,
        municipality: formData.municipality,
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

    let newRecords: LandRecord[] = [];
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
      setFormData({
        classification: selectedRecord.classification,
        actualUse: selectedRecord.actualUse,
        subClass: selectedRecord.subClass,
        classLevel: selectedRecord.classLevel || '1st',
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
      <div className="bg-transparent border-b border-slate-200 dark:border-slate-700 px-3 py-2">
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
            disabled={!selectedRecord}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-orange-600 dark:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownUp size={14} />
            Adjustment
          </button>
          <button
            onClick={() => setIsTreesOpen(true)}
            disabled={!selectedRecord}
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
                  key={record.uniqueId || record.id}
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
                  <td className="px-2 py-1.5 text-right border-r border-slate-200 dark:border-slate-700">
                    {record.area.toFixed(4)} {record.ifDefault ? 'ha.' : 'sq.m.'}
                  </td>
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
        tdn={selectedTdn}
        readOnly={!(isEnabled || isLocalFormEnabled)}
      />


      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Municipality */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Municipality:
              </label>
              <select
                value={formData.municipality}
                onChange={(e) => setFormData(prev => ({ ...prev, municipality: e.target.value }))}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Select Municipality</option>
                {municipalityOptions.map((opt, index) => (
                  <option key={`${opt.code}-${index}`} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Classification */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Classification:
              </label>
              <select
                value={formData.classification}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    classification: newVal,
                    subClass: newVal === 'AGR' ? '' : prev.subClass // Reset subClass if switching to AGR
                  }));
                }}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="input-classification"
              >
                <option value="">Select Classification</option>
                {classificationOptions.map((opt, index) => (
                  <option key={`${opt.code}-${index}`} value={opt.code}>{opt.code} - {opt.name}</option>
                ))}
              </select>
            </div>

            {/* Sub Class (Replaces Actual Use) */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Sub Class:
              </label>
              {formData.classification === 'AGR' ? (
                <div className="flex-1 flex gap-1">
                  <select
                    value={selectedAgriType}
                    onChange={(e) => setSelectedAgriType(e.target.value)}
                    disabled={!isFormEnabled}
                    className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="input-agri-type-select"
                  >
                    <option value="">Select Agricultural Type</option>
                    {agriTypeOptions.map((opt, index) => (
                      <option key={`${opt.code}-${index}`} value={opt.code}>{opt.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.subClass}
                    readOnly
                    placeholder="Result"
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded cursor-not-allowed"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.subClass}
                  onChange={(e) => setFormData(prev => ({ ...prev, subClass: e.target.value }))}
                  disabled={!isFormEnabled}
                  className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="input-sub-class"
                />
              )}
            </div>

            {/* Class Level */}
            <div className="flex items-center gap-2">
              <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Class Level:
              </label>
              <select
                value={formData.classLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, classLevel: e.target.value }))}
                disabled={!isFormEnabled}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
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
                <span className="text-xs text-slate-500 dark:text-slate-400 w-12">
                  <select
                    value={formData.ifDefault ? 'true' : 'false'}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifDefault: e.target.value === 'true' }))}
                    disabled={!isFormEnabled}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-500 dark:text-slate-400 cursor-pointer"
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
              <label className="w-36 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
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
                  className={`w-full px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${isLoadingUnitValue ? 'text-slate-400 dark:text-slate-500 pr-7' : ''}`}
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
