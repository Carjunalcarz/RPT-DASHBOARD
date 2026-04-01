import React, { useState, useEffect } from 'react';
import { Building2, TreePine, Cog } from 'lucide-react';
import { BuildingAssessment } from '../building';
import { LandAssessment } from '../land';
import { MachineryAssessment } from '../machinery';
import { RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';

interface AssessmentSectionProps {
  isEnabled?: boolean;
  assessmentRecords?: RptAssRecord[];
  isLoading?: boolean;
  onUpdate?: (records: any[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onRefresh?: () => void;
  trees?: any[]; // Array of tree records from parent
  status?: string;
}

type AssessmentType = 'land' | 'building' | 'machinery';

const AssessmentSection: React.FC<AssessmentSectionProps> = ({ 
  isEnabled, 
  assessmentRecords = [], 
  isLoading = false, 
  onUpdate, 
  onEditModeChange,
  onRefresh,
  trees = [], 
  status 
}) => {
  const [activeType, setActiveType] = useState<AssessmentType>('land'); // Default to land as it's often the base

  // Filter records by type
  // KIND: 'L'/'Land' = Land, 'B'/'Building' = Building, 'M'/'Machinery' = Machinery
  const landRecords = assessmentRecords
    .filter(r => r.KIND === 'L' || r.KIND === 'Land')
    .map(land => {
      // Attach trees that match the land's TDN
      // If trees are already attached to the land record, keep them. 
      // Otherwise, try to find them in the global trees list.
      if (land.trees && land.trees.length > 0) return land;
      
      const matchingTrees = trees.filter(t => t.TDN === land.TDN);
      return {
        ...land,
        trees: matchingTrees.length > 0 ? matchingTrees : []
      };
    });

  const buildingRecords = assessmentRecords.filter(r => r.KIND === 'B' || r.KIND === 'Building');
  const machineryRecords = assessmentRecords.filter(r => r.KIND === 'M' || r.KIND === 'Machinery');

  // Auto-switch tab based on available data or first record
  useEffect(() => {
    if (assessmentRecords.length > 0 && !isLoading) {
      // Logic: If we have specific records, switch to that tab.
      // If we have mixed, prioritize: Land -> Building -> Machinery
      // Or just switch to the type of the first record if we want to show what was clicked/loaded.
      
      const firstRecord = assessmentRecords[0];
      const kind = firstRecord.KIND;
      
      if (kind === 'L' || kind === 'Land') {
        setActiveType('land');
      } else if (kind === 'B' || kind === 'Building') {
        setActiveType('building');
      } else if (kind === 'M' || kind === 'Machinery') {
        setActiveType('machinery');
      }
    } else {
        // Optional: If no records, maybe default to land or stay?
        // Let's keep current selection or default to land.
    }
  }, [assessmentRecords, isLoading]);

  const handleUpdate = (type: AssessmentType, updatedTypeRecords: any[]) => {
    if (!onUpdate) return;
    
    // Filter out records of the *current type* from the *original* list to preserve others
    let otherRecords: any[] = [];
    
    if (type === 'land') {
      otherRecords = assessmentRecords.filter(r => r.KIND !== 'L' && r.KIND !== 'Land');
    } else if (type === 'building') {
      otherRecords = assessmentRecords.filter(r => r.KIND !== 'B' && r.KIND !== 'Building');
    } else if (type === 'machinery') {
      otherRecords = assessmentRecords.filter(r => r.KIND !== 'M' && r.KIND !== 'Machinery');
    }
    
    // Map the updated records to ensure they have the correct KIND if missing
    const mappedUpdatedRecords = updatedTypeRecords.map(r => {
        let kind = r.KIND || r.kind;
        if (!kind) {
            if (type === 'land') kind = 'Land';
            if (type === 'building') kind = 'Building';
            if (type === 'machinery') kind = 'Machinery';
        }
        
        // Ensure format compatibility if needed
        // The child components (LandAssessment etc) return their own Record types (LandRecord)
        // We might need to map them back to RptAssRecord format if backend expects strict structure
        // But for now we assume backend handles flexible JSON or child returns compatible structure
        
        return {
            ...r,
            trees: r.trees || [], // Explicitly preserve trees
            KIND: kind,
            // Map common fields to ensure they are available in RptAssRecord format
            TDN: r.TDN || r.id,
            CLASSIFICATION: r.CLASSIFICATION || r.classification,
            ACTUAL_USE: r.ACTUAL_USE || r.actualUse,
            SUB_CLASS: r.SUB_CLASS || r.subClass,
            AREA: r.AREA || r.area,
            UNIT_VALUE: r.UNIT_VALUE || r.unitValue,
            MARKET_VAL: r.MARKET_VAL || r.baseMarketValue,
            ASS_LEVEL: r.ASS_LEVEL || r.assessmentLevel,
            ASS_VALUE: r.ASS_VALUE || r.assessedValue,
            TAXABLE_RATE: r.taxable ? 100 : 0, // Simplified mapping
            IdleLand: r.IdleLand || r.idleLand
        };
    });

    const mergedRecords = [...otherRecords, ...mappedUpdatedRecords];
    onUpdate(mergedRecords);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Loading assessments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assessment Type Selector */}
      <div className="bg-transparent rounded-lg p-2 flex gap-2">
        <button
          onClick={() => setActiveType('land')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'land'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20'
          }`}
          data-testid="assessment-type-land"
        >
          <TreePine size={16} />
          Land Assessment
        </button>
        <button
          onClick={() => setActiveType('building')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'building'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
          data-testid="assessment-type-building"
        >
          <Building2 size={16} />
          Building Assessment
        </button>
        <button
          onClick={() => setActiveType('machinery')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'machinery'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          }`}
          data-testid="assessment-type-machinery"
        >
          <Cog size={16} />
          Machinery Assessment
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeType === 'land' && (
          <LandAssessment 
            records={landRecords} 
            isEnabled={isEnabled} 
            onUpdate={(records) => handleUpdate('land', records)}
            onEditModeChange={onEditModeChange}
            onRefresh={onRefresh}
            status={status}
          />
        )}
        {activeType === 'building' && (
          <BuildingAssessment 
            records={buildingRecords} 
            isEnabled={isEnabled} 
            onUpdate={(records) => handleUpdate('building', records)}
            onEditModeChange={onEditModeChange}
            onRefresh={onRefresh}
            status={status}
          />
        )}
        {activeType === 'machinery' && (
          <MachineryAssessment 
            records={machineryRecords} 
            isEnabled={isEnabled} 
            onUpdate={(records) => handleUpdate('machinery', records)}
            onEditModeChange={onEditModeChange}
            onRefresh={onRefresh}
            status={status}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentSection;
