import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="bg-surface dark:bg-surface rounded-t-lg shadow-sm mb-0">
      <div className="flex flex-wrap gap-1 px-2 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors rounded-t-lg ${
              activeTab === tab.id
                ? 'bg-primary dark:bg-primary/100 text-surface'
                : 'bg-muted/10 dark:bg-background text-foreground dark:text-foreground hover:bg-muted/20 dark:hover:bg-muted/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
