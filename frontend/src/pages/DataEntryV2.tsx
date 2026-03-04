import React from 'react';
import RealPropertyDataEntry from '@/components/data-entry-mirror/faas/RealPropertyDataEntry';
import { Building2, Home, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeColor } from '@/context/ThemeColorContext';

const DataEntryV2: React.FC = () => {
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
    <div data-testid="data-entry-page-v2" className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
       {/* Dynamic Color Header with Breadcrumb */}
       <div
        className="px-4 py-3 shadow-md z-10"
        style={{
          background: `linear-gradient(to right, ${darkerColor}, ${headerColor})`,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="linear-gradient"] {
              background: linear-gradient(to right, ${darkerColorDark}, ${headerColorDark}) !important;
            }
          }
        `}</style>
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-blue-100 mb-1" aria-label="Breadcrumb">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Home size={12} />
            <span>Home</span>
          </Link>
          <ChevronRight size={12} className="text-blue-300" />
          <span className="text-white font-medium">Data Entry (Mirror)</span>
        </nav>

        {/* Header Content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">REAL PROPERTY DATA ENTRY (MIRROR)</h1>
              <p className="text-blue-100 text-xs font-medium tracking-wide opacity-90">[Magallanes] - FAAS/TDN Management</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <RealPropertyDataEntry />
      </div>
    </div>
  );
};

export default DataEntryV2;