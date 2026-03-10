import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';

interface PropertyBoundariesSectionProps {
  isEnabled: boolean;
  selectedRecord: any | null;
  onUpdate?: (updatedData: any) => void;
}

interface BoundaryData {
  street: string;
  streetName: string;
  location: string;
  north: string;
  south: string;
  east: string;
  west: string;
}

const defaultData: BoundaryData = {
  street: '',
  streetName: '',
  location: '',
  north: '',
  south: '',
  east: '',
  west: '',
};

const emptyData: BoundaryData = {
  street: '',
  streetName: '',
  location: '',
  north: '',
  south: '',
  east: '',
  west: '',
};

const PropertyBoundariesSection: React.FC<PropertyBoundariesSectionProps> = ({ isEnabled, selectedRecord, onUpdate }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [data, setData] = useState<BoundaryData>(defaultData);

  React.useEffect(() => {
    // Reset to empty data on mount if no record selected
    if (!selectedRecord) {
      setData(emptyData);
    }
  }, []); // Run once on mount

  React.useEffect(() => {
    if (selectedRecord) {
      setData({
        street: selectedRecord.STREET_CD || '', // Map STREET_CD
        streetName: selectedRecord.STREET || '', // Map STREET
        location: selectedRecord.LOCATION || '', // Map LOCATION
        north: selectedRecord.NORTH || '',
        south: selectedRecord.SOUTH || '',
        east: selectedRecord.EAST || '',
        west: selectedRecord.WEST || '',
      });
    } else {
      setData(emptyData);
    }
  }, [selectedRecord]);

  const handleChange = (field: keyof BoundaryData, value: string) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Propagate changes to parent
      if (onUpdate) {
        const updatePayload: any = {};
        if (field === 'street') updatePayload.STREET_CD = value;
        if (field === 'streetName') updatePayload.STREET = value;
        if (field === 'location') updatePayload.LOCATION = value;
        if (field === 'north') updatePayload.NORTH = value;
        if (field === 'south') updatePayload.SOUTH = value;
        if (field === 'east') updatePayload.EAST = value;
        if (field === 'west') updatePayload.WEST = value;
        
        onUpdate(updatePayload);
      }
      
      return newData;
    });
  };

  const inputClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const selectClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const labelClass = "text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap min-w-[60px]";

  return (
    <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-800/50 dark:to-orange-900/10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Section Header */}
      <div
        className="px-4 py-2.5"
        style={{
          backgroundColor: 'var(--header-bg-color)',
          ['--header-bg-color' as any]: headerColor,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="--header-bg-color"] {
              --header-bg-color: ${headerColorDark} !important;
            }
          }
        `}</style>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MapPin size={16} />
          Property Boundaries
        </h3>
      </div>

      {/* Form Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Street */}
            <div className="flex items-center gap-3">
              <label className={labelClass}>Street:</label>
              <select
                value={data.street}
                onChange={(e) => handleChange('street', e.target.value)}
                disabled={!isEnabled}
                className={`${selectClass} w-24`}
                data-testid="select-street"
              >
                <option value="">Select</option>
              </select>
              <input
                type="text"
                value={data.streetName}
                onChange={(e) => handleChange('streetName', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                placeholder="Street name"
                data-testid="input-street-name"
              />
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <label className={labelClass}>Location:</label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => handleChange('location', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                placeholder="Location description"
                data-testid="input-location"
              />
            </div>

            {/* North */}
            <div className="flex items-center gap-3">
              <label className={`${labelClass} text-blue-600 dark:text-blue-400 font-semibold`}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="rotate-0" />
                  North:
                </span>
              </label>
              <input
                type="text"
                value={data.north}
                onChange={(e) => handleChange('north', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-north"
              />
            </div>

            {/* East */}
            <div className="flex items-center gap-3">
              <label className={`${labelClass} text-green-600 dark:text-green-400 font-semibold`}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="rotate-90" />
                  East:
                </span>
              </label>
              <input
                type="text"
                value={data.east}
                onChange={(e) => handleChange('east', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-east"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Empty space for alignment */}
            <div className="h-[38px]"></div>
            <div className="h-[38px]"></div>

            {/* South */}
            <div className="flex items-center gap-3">
              <label className={`${labelClass} text-red-600 dark:text-red-400 font-semibold`}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="rotate-180" />
                  South:
                </span>
              </label>
              <input
                type="text"
                value={data.south}
                onChange={(e) => handleChange('south', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-south"
              />
            </div>

            {/* West */}
            <div className="flex items-center gap-3">
              <label className={`${labelClass} text-orange-600 dark:text-orange-400 font-semibold`}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="-rotate-90" />
                  West:
                </span>
              </label>
              <input
                type="text"
                value={data.west}
                onChange={(e) => handleChange('west', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-west"
              />
            </div>
          </div>
        </div>

        {/* Visual Boundary Map (decorative) */}
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
          <div className="relative aspect-[2/1] max-w-md mx-auto">
            {/* North Label */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate max-w-[200px]" title={data.north}>
              N: {data.north.substring(0, 30)}...
            </div>
            {/* South Label */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-medium text-red-600 dark:text-red-400 truncate max-w-[200px]" title={data.south}>
              S: {data.south.substring(0, 30)}...
            </div>
            {/* East Label */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-medium text-green-600 dark:text-green-400 writing-vertical truncate max-h-[80px]" title={data.east} style={{ writingMode: 'vertical-rl' }}>
              E: {data.east.substring(0, 20)}...
            </div>
            {/* West Label */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-medium text-orange-600 dark:text-orange-400 writing-vertical truncate max-h-[80px]" title={data.west} style={{ writingMode: 'vertical-lr' }}>
              W: {data.west.substring(0, 20)}...
            </div>
            {/* Center Property */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded flex items-center justify-center">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">PROPERTY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyBoundariesSection;
