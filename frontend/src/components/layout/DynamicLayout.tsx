import React from 'react';
import { useLayoutToggle } from '@/context/LayoutToggleContext';
import MainLayout from '@/components/layout/Layout';
import RptLayout from '@/components/rpt_layout/Layout';

export const DynamicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { layoutMode } = useLayoutToggle();
  return layoutMode === 'rpt' ? <RptLayout>{children}</RptLayout> : <MainLayout>{children}</MainLayout>;
};

export default DynamicLayout;
