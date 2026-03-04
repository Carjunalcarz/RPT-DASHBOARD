import React, { useState } from 'react';
import { Building2, TreePine, Cog } from 'lucide-react';
import { BuildingAssessment } from './building';

interface AssessmentTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

type AssessmentType = 'land' | 'building' | 'machinery';

const AssessmentTab: React.FC<AssessmentTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [activeType, setActiveType] = useState<AssessmentType>('building');

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
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center">
            <TreePine size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Land Assessment
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Land assessment module will be implemented here.
            </p>
          </div>
        )}

        {activeType === 'building' && (
          <BuildingAssessment />
        )}

        {activeType === 'machinery' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Cog size={48} className="mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Machinery Assessment
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Machinery assessment module will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentTab;
