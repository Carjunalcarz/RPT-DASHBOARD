import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  isEditing: boolean;
  editingTab: string | null;
  hasUnsavedChanges: boolean;
  onTabClick: (tabId: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  isEditing,
  editingTab,
  hasUnsavedChanges,
  onTabClick,
}) => {
  return (
    <div className="bg-surface dark:bg-surface rounded-t-lg shadow-sm sticky top-16 z-30">
      <div className="flex flex-wrap gap-1 px-2 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = isEditing && editingTab !== tab.id;
          const isCurrentlyEditing = editingTab === tab.id && isEditing;

          return (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              disabled={isDisabled}
              className={`relative px-4 py-2 text-xs font-medium transition-all rounded-t-lg ${
                isActive
                  ? 'bg-primary dark:bg-primary/100 text-surface'
                  : isDisabled
                  ? 'bg-background dark:bg-background/50 text-muted dark:text-muted cursor-not-allowed opacity-50'
                  : 'bg-muted/10 dark:bg-background text-foreground dark:text-foreground hover:bg-muted/20 dark:hover:bg-muted/20'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {isCurrentlyEditing && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-yellow-300">Editing</span>
                  </span>
                )}
                {hasUnsavedChanges && isActive && isEditing && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                    title="Unsaved changes"
                  ></span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
