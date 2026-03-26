import React from 'react';
import { Building2, DollarSign, FileText, User, Info } from 'lucide-react';
import PropertyInformationSection from './rpt_m_PropertyInformationSection';
import PropertyOwnerSection from './rpt_m_PropertyOwnerSection';
import PropertyBoundariesSection from './rpt_m_PropertyBoundariesSection';
import AssessmentSection from './rpt_m_AssessmentSection';
import ReferenceSection from './rpt_m_ReferenceSection';
import SignatoriesSection from './rpt_m_SignatoriesSection';
import PreviousTDNsSection from './rpt_m_PreviousTDNsSection';
import TaxDecSheetSection from './rpt_m_TaxDecSheetSection';
import OtherPropertyTab from '../rpt_m_OtherPropertyTab';
import { PropertyRecord } from './types';

interface PropertyDetailsViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isFormEnabled: boolean;
  selectedRecord: PropertyRecord | null;
  assessmentRecords: any[]; // Type RptAssRecord[]
  isAssessmentLoading: boolean;
  onRecordUpdate: (updatedData: Partial<PropertyRecord>) => void;
  onAssessmentUpdate: (updatedAssessmentRecords: any[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  isAdding?: boolean;
  // For OtherPropertyTab
  onSave?: () => void;
  onCancel?: () => void;
}

const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  activeTab,
  setActiveTab,
  isFormEnabled,
  selectedRecord,
  assessmentRecords,
  isAssessmentLoading,
  onRecordUpdate,
  onAssessmentUpdate,
  onEditModeChange,
  isAdding,
  onSave,
  onCancel
}) => {
  const tabs = [
    { id: 'property-info', label: 'Property Information', icon: Building2 },
    { id: 'assessment', label: 'Assessment', icon: DollarSign },
    { id: 'reference', label: 'Reference', icon: FileText },
    { id: 'signatories', label: 'Signatories / Memorandum', icon: User },
    { id: 'other-info', label: 'Other Property Information', icon: Info },
    { id: 'previous-tdns', label: 'Previous TDNs', icon: FileText },
    { id: 'tax-dec', label: 'Tax Dec. Sheet', icon: FileText },
  ];

  return (
    <div data-testid="property-details-view" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {activeTab === 'property-info' && (
          <>
            <PropertyInformationSection
              isEnabled={isFormEnabled}
              selectedRecord={selectedRecord}
              onUpdate={onRecordUpdate}
              isAdding={isAdding}
            />
            <PropertyOwnerSection
              isEnabled={isFormEnabled}
              selectedRecord={selectedRecord}
              onUpdate={onRecordUpdate}
            />
            <PropertyBoundariesSection
              isEnabled={isFormEnabled}
              selectedRecord={selectedRecord}
              onUpdate={onRecordUpdate}
            />
          </>
        )}

        {activeTab === 'assessment' && (
          <AssessmentSection
            isEnabled={isFormEnabled}
            assessmentRecords={assessmentRecords}
            isLoading={isAssessmentLoading}
            onUpdate={onAssessmentUpdate}
            trees={selectedRecord?.trees || []}
            status={selectedRecord?.status}
          />
        )}
        
        {activeTab === 'reference' && (
          <ReferenceSection 
            selectedRecord={selectedRecord} 
            isEnabled={isFormEnabled} 
            onUpdate={onRecordUpdate}
          />
        )}
        
        {activeTab === 'signatories' && (
          <SignatoriesSection 
            selectedRecord={selectedRecord} 
            isEnabled={isFormEnabled} 
            onEditModeChange={onEditModeChange}
            onUpdate={onRecordUpdate}
          />
        )}
        
        {activeTab === 'other-info' && (
          <OtherPropertyTab
            isEditing={isFormEnabled}
            onEnterEdit={() => {}}
            onSave={onSave || (() => {})}
            onCancel={onCancel || (() => {})}
            onDataChange={() => {}}
          />
        )}
        
        {activeTab === 'previous-tdns' && (
          <PreviousTDNsSection selectedRecord={selectedRecord} />
        )}
        
        {activeTab === 'tax-dec' && (
          <TaxDecSheetSection />
        )}
      </div>
    </div>
  );
};

export default PropertyDetailsView;
