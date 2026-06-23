import React from 'react';
import { Building2, DollarSign, FileText, User, Info } from 'lucide-react';
import PropertyInformationSection from "./PropertyInformationSection";
import PropertyOwnerSection from "./PropertyOwnerSection";
import PropertyBoundariesSection from "./PropertyBoundariesSection";
import AssessmentSection from "./AssessmentSection";
import ReferenceSection from "./ReferenceSection";
import SignatoriesSection from './SignatoriesSection';
import PreviousTDNsSection from "./PreviousTDNsSection";
import TaxDecSheetSection from "./TaxDecSheetSection";
import OtherPropertyTab from "../OtherPropertyTab";
import { PropertyRecord } from '@/modules/rptas/shared/components/data-entry/faas/RealPropertyDataEntry';

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
    <div data-testid="property-details-view" className="bg-surface dark:bg-surface rounded-xl shadow-sm border border-border dark:border-border overflow-hidden h-full flex flex-col">
      <div className="bg-muted/10 dark:bg-background border-b border-border dark:border-border px-2 pt-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-surface dark:bg-surface text-primary dark:text-primary border-t-2 border-t-primary shadow-sm'
                    : 'bg-muted/20 dark:bg-muted/20 text-muted dark:text-muted hover:bg-slate-300 dark:hover:bg-muted/30'
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
