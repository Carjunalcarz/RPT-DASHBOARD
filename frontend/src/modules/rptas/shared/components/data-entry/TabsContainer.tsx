import React, { ReactNode } from 'react';
import TabNavigation from './TabNavigation';
import TabPanel from './TabPanel';
import ConfirmLeaveModal from './ConfirmLeaveModal';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsContainerProps {
  tabs: Tab[];
  activeTab: string;
  isEditing: boolean;
  editingTab: string | null;
  hasUnsavedChanges: boolean;
  pendingTab: string | null;
  onTabClick: (tabId: string) => void;
  onConfirmSwitch: () => void;
  onCancelSwitch: () => void;
}

const TabsContainer: React.FC<TabsContainerProps> = ({
  tabs,
  activeTab,
  isEditing,
  editingTab,
  hasUnsavedChanges,
  pendingTab,
  onTabClick,
  onConfirmSwitch,
  onCancelSwitch,
}) => {
  return (
    <div>
      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        isEditing={isEditing}
        editingTab={editingTab}
        hasUnsavedChanges={hasUnsavedChanges}
        onTabClick={onTabClick}
      />

      {/* Tab Panels */}
      <div className="mt-0">
        {tabs.map((tab) => (
          <TabPanel key={tab.id} isActive={activeTab === tab.id}>
            {tab.content}
          </TabPanel>
        ))}
      </div>

      {/* Confirm Leave Modal */}
      <ConfirmLeaveModal
        isOpen={!!pendingTab}
        onConfirm={onConfirmSwitch}
        onCancel={onCancelSwitch}
      />
    </div>
  );
};

export default TabsContainer;
