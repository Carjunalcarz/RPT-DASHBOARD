import React from 'react';
import { RealPropertyDataEntry } from '@/modules/rptas/shared/components/data-entry/faas';

const DataEntry: React.FC = () => {
  return (
    <div data-testid="data-entry-page" className="min-h-full flex flex-col">
      <RealPropertyDataEntry />
    </div>
  );
};

export default DataEntry;
