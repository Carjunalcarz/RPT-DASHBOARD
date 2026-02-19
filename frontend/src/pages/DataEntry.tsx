import React, { useCallback } from 'react';
import PageHeader from '@/components/data-entry/PageHeader';
import SearchCard from '@/components/data-entry/SearchCard';
import TabsContainer from '@/components/data-entry/TabsContainer';
import PropertyInformationTab from '@/components/data-entry/PropertyInformationTab';
import AssessmentTab from '@/components/data-entry/AssessmentTab';
import ReferenceTab from '@/components/data-entry/ReferenceTab';
import SignatoriesTab from '@/components/data-entry/SignatoriesTab';
import OtherPropertyTab from '@/components/data-entry/OtherPropertyTab';
import PreviousTDNsTab from '@/components/data-entry/PreviousTDNsTab';
import TagDecTab from '@/components/data-entry/TagDecTab';
import { useTabManager } from '@/components/data-entry/useTabManager';
import { Settings, FileJson } from 'lucide-react';

const DataEntry: React.FC = () => {
  const {
    activeTab,
    isEditing,
    editingTab,
    hasUnsavedChanges,
    pendingTab,
    switchTab,
    enterEditMode,
    exitEditMode,
    setUnsavedChanges,
    confirmSwitch,
    cancelSwitch,
  } = useTabManager('property-info');

  const handlePinSearch = (pin: string) => {
    console.log('Searching by PIN:', pin);
  };

  const handleLocationSearch = (municipality: string, barangay: string) => {
    console.log('Searching by location:', { municipality, barangay });
  };

  // Common handlers for all tabs
  const createTabHandlers = useCallback((tabId: string) => ({
    isEditing: editingTab === tabId && isEditing,
    onEnterEdit: () => enterEditMode(tabId),
    onSave: () => exitEditMode(),
    onCancel: () => exitEditMode(),
    onDataChange: (hasChanges: boolean) => setUnsavedChanges(hasChanges),
  }), [editingTab, isEditing, enterEditMode, exitEditMode, setUnsavedChanges]);

  const tabs = [
    {
      id: 'property-info',
      label: 'Property Information',
      content: <PropertyInformationTab {...createTabHandlers('property-info')} />,
    },
    {
      id: 'assessment',
      label: 'Assessment',
      content: <AssessmentTab {...createTabHandlers('assessment')} />,
    },
    {
      id: 'reference',
      label: 'Reference',
      content: <ReferenceTab {...createTabHandlers('reference')} />,
    },
    {
      id: 'signatories',
      label: 'Signatories / Memorandum',
      content: <SignatoriesTab {...createTabHandlers('signatories')} />,
    },
    {
      id: 'other-property',
      label: 'Other Property Information',
      content: <OtherPropertyTab {...createTabHandlers('other-property')} />,
    },
    {
      id: 'previous-tdns',
      label: 'Previous TDNs',
      content: <PreviousTDNsTab {...createTabHandlers('previous-tdns')} />,
    },
    {
      id: 'tag-dec',
      label: 'Tag Dec. Sheet',
      content: <TagDecTab {...createTabHandlers('tag-dec')} />,
    },
  ];

  return (
    <div data-testid="data-entry-page">
      {/* Header */}
      <PageHeader
        title="REAL PROPERTY DATA ENTRY"
        subtitle="Tubay - FAAS/TDN Management"
      />

      {/* Search Card */}
      <SearchCard
        onPinSearch={handlePinSearch}
        onLocationSearch={handleLocationSearch}
      />

      {/* Edit Mode Indicator */}
      {isEditing && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            Edit mode active on <strong>{tabs.find(t => t.id === editingTab)?.label}</strong> tab. 
            Other tabs are disabled until you save or cancel.
          </span>
          <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-auto">
            Press Ctrl+S to save, Esc to cancel
          </span>
        </div>
      )}

      {/* View JSON Data Button */}
      <div className="flex justify-end mb-4">
        <button
          data-testid="view-json-button"
          className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
        >
          <FileJson size={16} />
          View JSON Data
        </button>
      </div>

      {/* Tabs Container with all functionality */}
      <TabsContainer
        tabs={tabs}
        activeTab={activeTab}
        isEditing={isEditing}
        editingTab={editingTab}
        hasUnsavedChanges={hasUnsavedChanges}
        pendingTab={pendingTab}
        onTabClick={switchTab}
        onConfirmSwitch={confirmSwitch}
        onCancelSwitch={cancelSwitch}
      />

      {/* Floating Settings Button */}
      <button
        data-testid="settings-floating-button"
        className="fixed right-6 bottom-6 w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center z-50"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
    </div>
  );
};

export default DataEntry;
