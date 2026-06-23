import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

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

  const inputClass = `w-full px-3 py-2 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
    !isEnabled ? 'bg-background dark:bg-background/50 cursor-not-allowed opacity-70' : ''
  }`;

  const selectClass = `w-full px-3 py-2 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none ${
    !isEnabled ? 'bg-background dark:bg-background/50 cursor-not-allowed opacity-70' : ''
  }`;

  const labelClass = "text-xs font-medium text-muted dark:text-muted whitespace-nowrap min-w-[60px]";

  return (
    <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-800/50 dark:to-orange-900/10 rounded-xl border border-border dark:border-border overflow-hidden">
      {/* Section Header */}
      <div
        className="px-4 py-2.5 bg-primary"
      >
        
        <h3 className="text-sm font-semibold text-surface flex items-center gap-2">
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
              <label className={`${labelClass} text-primary dark:text-primary font-semibold`}>
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
              <label className={`${labelClass} text-success dark:text-success font-semibold`}>
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
              <label className={`${labelClass} text-danger dark:text-danger font-semibold`}>
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
              <label className={`${labelClass} text-warning dark:text-warning font-semibold`}>
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
        <div className="mt-4 p-4 bg-surface dark:bg-background rounded-lg border border-dashed border-border dark:border-border">
          <div className="relative aspect-[2/1] max-w-md mx-auto">
            {/* North Label */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary dark:text-primary truncate max-w-[200px]" title={data.north}>
              N: {data.north.substring(0, 30)}...
            </div>
            {/* South Label */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-medium text-danger dark:text-danger truncate max-w-[200px]" title={data.south}>
              S: {data.south.substring(0, 30)}...
            </div>
            {/* East Label */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-medium text-success dark:text-success writing-vertical truncate max-h-[80px]" title={data.east} style={{ writingMode: 'vertical-rl' }}>
              E: {data.east.substring(0, 20)}...
            </div>
            {/* West Label */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-medium text-warning dark:text-warning writing-vertical truncate max-h-[80px]" title={data.west} style={{ writingMode: 'vertical-lr' }}>
              W: {data.west.substring(0, 20)}...
            </div>
            {/* Center Property */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 bg-primary/10 dark:bg-primary/10 border-2 border-primary/50 rounded flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary dark:text-primary">PROPERTY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyBoundariesSection;
