import React, { useState, useEffect } from 'react';
import { Building2, TreePine, Cog } from 'lucide-react';
import { BuildingAssessment } from '../building';
import { LandAssessment } from '../land';
import { MachineryAssessment } from '../machinery';
import { RptAssRecord } from '@/services/rptAssService';

interface AssessmentSectionProps {
  isEnabled?: boolean;
  assessmentRecords?: RptAssRecord[];
  isLoading?: boolean;
  onUpdate?: (updatedRecords: RptAssRecord[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onRefresh?: () => void;
  onPrint?: () => void;
}

type AssessmentType = 'land' | 'building' | 'machinery';

const AssessmentSection: React.FC<AssessmentSectionProps> = ({ isEnabled, assessmentRecords = [], isLoading = false, onUpdate, onPrint }) => {
  const [activeType, setActiveType] = useState<AssessmentType>('land'); // Default to land as it's often the base

  // Filter records by type
  // KIND: 'L'/'Land' = Land, 'B'/'Building' = Building, 'M'/'Machinery' = Machinery
  const landRecords = assessmentRecords.filter(r => r.KIND === 'L' || r.KIND === 'Land');
  const buildingRecords = assessmentRecords.filter(r => r.KIND === 'B' || r.KIND === 'Building');
  const machineryRecords = assessmentRecords.filter(r => r.KIND === 'M' || r.KIND === 'Machinery');

  // Handle updates from child components
  const handleLandUpdate = (updatedLandRecords: any[]) => {
    // Merge updated land records back into the main list
    // We need to replace the old land records with the new ones, while keeping building/machinery records
    const otherRecords = assessmentRecords.filter(r => r.KIND !== 'L' && r.KIND !== 'Land');
    const newRecords = [...otherRecords, ...updatedLandRecords];
    if (onUpdate) onUpdate(newRecords);
  };

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
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex gap-2">
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

      {/* Assessment Content */}
      <div>
        {activeType === 'land' && (
          <LandAssessment
            records={landRecords}
            isEnabled={isEnabled}
            onUpdate={handleLandUpdate}
            onPrint={onPrint}
          />
        )}

        {activeType === 'building' && (
          <BuildingAssessment 
            records={buildingRecords}
            isEnabled={isEnabled}
            onPrint={onPrint}
          />
        )}

        {activeType === 'machinery' && (
          <MachineryAssessment
            records={machineryRecords}
            isEnabled={isEnabled}
            onPrint={onPrint}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentSection;
