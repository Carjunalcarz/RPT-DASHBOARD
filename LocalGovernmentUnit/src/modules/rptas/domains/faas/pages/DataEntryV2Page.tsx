import React from 'react';
import RealPropertyDataEntry from '../../RPT-management/faas/rpt_m_RealPropertyDataEntry';

const DataEntryV2Page: React.FC = () => {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <RealPropertyDataEntry />
    </div>
  );
};

export default DataEntryV2Page;
