import React, { ReactNode } from 'react';

interface TabPanelProps {
  children: ReactNode;
  isActive: boolean;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, isActive }) => {
  if (!isActive) return null;

  return (
    <div
      className="animate-fadeIn"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {children}
    </div>
  );
};

export default TabPanel;
