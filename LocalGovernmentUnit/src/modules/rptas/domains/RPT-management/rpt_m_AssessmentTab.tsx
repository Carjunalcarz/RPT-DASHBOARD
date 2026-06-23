import React, { useState } from 'react';
import { Building2, TreePine, Cog } from 'lucide-react';
import { BuildingAssessment } from './building';

interface AssessmentTabProps {
  isEditing: boolean;
  isTransactionActive?: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

type AssessmentType = 'land' | 'building' | 'machinery';

const AssessmentTab: React.FC<AssessmentTabProps> = ({
  isEditing,
  isTransactionActive = false,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [activeType, setActiveType] = useState<AssessmentType>('building');
  const isEnabled = isEditing || isTransactionActive;

  return (
    <div className="space-y-4">
      {/* Assessment Type Selector */}
      <div className="bg-muted/10 dark:bg-background rounded-lg p-2 flex gap-2">
        <button
          onClick={() => setActiveType('land')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'land'
              ? 'bg-success text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-success/10 dark:hover:bg-green-900/20'
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
              ? 'bg-primary text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20'
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
              ? 'bg-orange-600 text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-warning/10 dark:hover:bg-orange-900/20'
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
          <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-8 text-center">
            <TreePine size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-foreground dark:text-surface mb-2">
              Land Assessment
            </h3>
            <p className="text-sm text-muted dark:text-muted">
              Land assessment module will be implemented here.
            </p>
          </div>
        )}

        {activeType === 'building' && (
          <BuildingAssessment isEnabled={isEnabled} />
        )}

        {activeType === 'machinery' && (
          <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-8 text-center">
            <Cog size={48} className="mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold text-foreground dark:text-surface mb-2">
              Machinery Assessment
            </h3>
            <p className="text-sm text-muted dark:text-muted">
              Machinery assessment module will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentTab;
