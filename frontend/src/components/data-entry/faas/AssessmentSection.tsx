import React from 'react';
import { Building2, TreePine, Cog } from 'lucide-react';

interface AssessmentSectionProps {
  isEnabled?: boolean;
}

const AssessmentSection: React.FC<AssessmentSectionProps> = ({ isEnabled }) => {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Select an assessment type to view and edit assessment details:
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button className="flex flex-col items-center gap-2 p-6 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl transition-colors group">
          <TreePine size={32} className="text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Land Assessment</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-6 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors group">
          <Building2 size={32} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Building Assessment</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-6 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl transition-colors group">
          <Cog size={32} className="text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Machinery Assessment</span>
        </button>
      </div>
    </div>
  );
};

export default AssessmentSection;
