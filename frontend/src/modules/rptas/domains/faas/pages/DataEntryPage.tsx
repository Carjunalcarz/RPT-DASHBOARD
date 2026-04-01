import React from 'react';
import { RealPropertyDataEntry } from '@/modules/rptas/shared/components/data-entry/faas';
import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeColor } from '@/context/ThemeColorContext';

import RptBreadcrumb from '@/modules/rptas/shared/components/data-entry/Breadcrumb';

const DataEntry: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  
  // Convert hex to RGB for gradient
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 37, g: 99, b: 235 }; // default blue
  };

  const rgb = hexToRgb(headerColor);
  const darkerColor = `rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)})`;
  
  const rgbDark = hexToRgb(headerColorDark);
  const darkerColorDark = `rgb(${Math.max(0, rgbDark.r - 40)}, ${Math.max(0, rgbDark.g - 40)}, ${Math.max(0, rgbDark.b - 40)})`;
  
  return (
    <div data-testid="data-entry-page" className="min-h-full flex flex-col">
      {/* Dynamic Color Header with Breadcrumb */}
      <div
        className="px-4 py-3 -mx-6 -mt-6 mb-6"
        style={{
          backgroundColor: headerColor,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="background-color"] {
              background-color: ${headerColorDark} !important;
            }
          }
        `}</style>
        {/* Breadcrumb */}
        <RptBreadcrumb 
          items={[{ label: 'Data Entry' }]} 
          className="mb-3"
        />

        {/* Header Content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">REAL PROPERTY DATA ENTRY</h1>
              <p className="text-blue-100 text-xs">[Magallanes] - FAAS/TDN Management</p>
            </div>
          </div>
        </div>
      </div>
      
      <RealPropertyDataEntry />
    </div>
  );
};

export default DataEntry;
