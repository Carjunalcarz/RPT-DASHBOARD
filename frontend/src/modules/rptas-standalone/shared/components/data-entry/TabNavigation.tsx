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
    <div className="bg-white dark:bg-slate-900 rounded-t-lg shadow-sm sticky top-16 z-30">
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
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : isDisabled
                  ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
