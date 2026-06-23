import React, { useState } from 'react';
import {  Info } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';

interface OtherPropertyTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

const OtherPropertyTab: React.FC<OtherPropertyTabProps> = ({
  isEditing,

}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [activeSubTab, setActiveSubTab] = useState<'cloa' | 'mortgage'>('cloa');
  
  // CLOA/CSC Form Data
  const [cloaData, setCloaData] = useState({
    cloaCscNo: '',
    cloaCscDate: '',
    adjustmentFactor: '',
    adjustmentEntryDate: '',
    propertyTag: '',
    fileNo: '',
    amount: '0.00',
    orNo: '',
    date: '',
    signatory: '',
    cancelledAnnotation: false,
  });

  // Mortgage Form Data
  const [mortgageData, setMortgageData] = useState({
    mortgageAmount: '0.00',
    bank: '',
    mortgageName: '',
    mortgageDate: '',
    notaryPublic: '',
    notaryDate: '',
  });

  const subTabs = [
    { id: 'cloa' as const, label: 'Properties under CLOA Entry' },
    { id: 'mortgage' as const, label: 'Mortgage Property Entry' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        
        <div className="flex items-center gap-2">
          <Info size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Other Property Information</h2>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
        <div className="flex gap-1">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-primary dark:text-primary/80 border-t-2 border-t-primary/50'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">
          {activeSubTab === 'cloa' && (
            <>
              {/* CLOA/CSC Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    CLOA/CSC No:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={cloaData.cloaCscNo}
                    onChange={(e) => setCloaData({ ...cloaData, cloaCscNo: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    CLOA/CSC Date:
                  </label>
                </div>
                <div>
                  <input
                    type="date"
                    value={cloaData.cloaCscDate}
                    onChange={(e) => setCloaData({ ...cloaData, cloaCscDate: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Adjustment Factor:
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cloaData.adjustmentFactor}
                    onChange={(e) => setCloaData({ ...cloaData, adjustmentFactor: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  >
                    <option value=""></option>
                  </select>
                  <input
                    type="text"
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Adjustment Entry Date:
                  </label>
                </div>
                <div>
                  <input
                    type="date"
                    value={cloaData.adjustmentEntryDate}
                    onChange={(e) => setCloaData({ ...cloaData, adjustmentEntryDate: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Property Tag:
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cloaData.propertyTag}
                    onChange={(e) => setCloaData({ ...cloaData, propertyTag: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  >
                    <option value=""></option>
                  </select>
                  <input
                    type="text"
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="border-t-2 border-slate-300 dark:border-slate-600 my-4"></div>

              {/* Mortgage Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    File No:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={cloaData.fileNo}
                    onChange={(e) => setCloaData({ ...cloaData, fileNo: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Amount:
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={cloaData.amount}
                    onChange={(e) => setCloaData({ ...cloaData, amount: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      O.R No.:
                    </label>
                    <input
                      type="text"
                      value={cloaData.orNo}
                      onChange={(e) => setCloaData({ ...cloaData, orNo: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Date:
                  </label>
                </div>
                <div>
                  <input
                    type="date"
                    value={cloaData.date}
                    onChange={(e) => setCloaData({ ...cloaData, date: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Signatory:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={cloaData.signatory}
                    onChange={(e) => setCloaData({ ...cloaData, signatory: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div></div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cloaData.cancelledAnnotation}
                      onChange={(e) => setCloaData({ ...cloaData, cancelledAnnotation: e.target.checked })}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Cancelled Annotation</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'mortgage' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Mortgage Amount:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={mortgageData.mortgageAmount}
                    onChange={(e) => setMortgageData({ ...mortgageData, mortgageAmount: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Bank:
                  </label>
                </div>
                <div>
                  <select
                    value={mortgageData.bank}
                    onChange={(e) => setMortgageData({ ...mortgageData, bank: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  >
                    <option value=""></option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Mortgage Name:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={mortgageData.mortgageName}
                    onChange={(e) => setMortgageData({ ...mortgageData, mortgageName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Mortgage Date:
                  </label>
                </div>
                <div>
                  <input
                    type="date"
                    value={mortgageData.mortgageDate}
                    onChange={(e) => setMortgageData({ ...mortgageData, mortgageDate: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Notary Public:
                  </label>
                </div>
                <div>
                  <input
                    type="text"
                    value={mortgageData.notaryPublic}
                    onChange={(e) => setMortgageData({ ...mortgageData, notaryPublic: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                    Notary Date:
                  </label>
                </div>
                <div>
                  <input
                    type="date"
                    value={mortgageData.notaryDate}
                    onChange={(e) => setMortgageData({ ...mortgageData, notaryDate: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default OtherPropertyTab;
