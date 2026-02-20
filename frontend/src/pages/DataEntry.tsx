import React from 'react';
import { RealPropertyDataEntry } from '@/components/data-entry/faas';

const DataEntry: React.FC = () => {
  return (
    <div data-testid="data-entry-page" className="h-[calc(100vh-64px)]">
      <RealPropertyDataEntry />
    </div>
  );
};

export default DataEntry;
