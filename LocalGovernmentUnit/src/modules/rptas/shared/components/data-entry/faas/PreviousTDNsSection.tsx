import React, { useState } from 'react';
import { Plus, X, FileText } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';

interface PreviousTDN {
  id: string;
  tdn: string;
  previousTdn: string;
  pin: string;
  effectivityDate: string;
  ownerCode: string;
  declaredOwner: string;
  prevMarketValue: string;
  prevAssessedValue: string;
}

interface PreviousTDNsSectionProps {
  selectedRecord?: any;
}

const PreviousTDNsSection: React.FC<PreviousTDNsSectionProps> = ({ selectedRecord }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<PreviousTDN[]>([]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">PREVIOUS TDN</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5">
            <Plus size={14} />
            Assessment
          </button>
          <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5">
            <X size={14} />
            Close
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead
            className="text-white bg-primary"
          >
            
            <tr>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">TDN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Previous TDN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">PIN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Effectivity Date</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Owner Code</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Declared Owner</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Prev. Market Value</th>
              <th className="px-2 py-2 text-right font-medium">Prev. Assessed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No previous TDN records found.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={`${record.id}-${index}`}
                  className={`cursor-pointer transition-colors ${
                    index % 2 === 0
                      ? 'bg-slate-50 dark:bg-slate-800/30 hover:bg-primary/5 dark:hover:bg-primary/5'
                      : 'bg-white dark:bg-slate-900 hover:bg-primary/5 dark:hover:bg-primary/5'
                  }`}
                >
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.tdn}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.previousTdn}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.pin}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.effectivityDate}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.ownerCode}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.declaredOwner}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.prevMarketValue}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{record.prevAssessedValue}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreviousTDNsSection;
