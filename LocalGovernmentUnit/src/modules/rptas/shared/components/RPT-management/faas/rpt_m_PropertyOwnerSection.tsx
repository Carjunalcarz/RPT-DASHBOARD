import React, { useState } from 'react';
import { User, Search } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';

interface PropertyRecord {
  id: string;
  OWNER_NO: string;
  owner: string;
  pOwnerNo?: string; // Previous/Other Owner No
  pOwner?: string; // Previous/Other Owner
  pOwnerCode?: string; // Previous/Other Owner Code
  // ... other fields if needed for Administrator
}

interface PropertyOwnerSectionProps {
  isEnabled: boolean;
  selectedRecord: any | null; // Use any or specific type if shared
  onUpdate?: (updatedData: any) => void;
}

interface OwnerData {
  code: string;
  number: string;
  name: string;
  address: string;
}

interface OwnerAdminData {
  owner: OwnerData;
  administrator: OwnerData;
}

const defaultData: OwnerAdminData = {
  owner: {
    code: '',
    number: '',
    name: '',
    address: '',
  },
  administrator: {
    code: '',
    number: '',
    name: '',
    address: '',
  },
};

const codeOptions = [
  { value: 'SING', label: 'SING - Single' },
  { value: 'MAR', label: 'MAR - Married' },
  { value: 'WID', label: 'WID - Widow/er' },
  { value: 'CORP', label: 'CORP - Corporation' },
  { value: 'GOV', label: 'GOV - Government' },
  { value: 'HRS', label: 'HRS - Heirs' },
];

const emptyData: OwnerAdminData = {
  owner: {
    code: '',
    number: '',
    name: '',
    address: '',
  },
  administrator: {
    code: '',
    number: '',
    name: '',
    address: '',
  },
};

const PropertyOwnerSection: React.FC<PropertyOwnerSectionProps> = ({ isEnabled, selectedRecord, onUpdate }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [data, setData] = useState<OwnerAdminData>(defaultData);

  React.useEffect(() => {
    if (selectedRecord) {
      setData(prev => ({
        ...prev,
        owner: {
          code: selectedRecord.OWN_CD || 'SING',
          number: selectedRecord.OWNER_NO || '',
          name: selectedRecord.owner || '',
          address: selectedRecord.Owner_Address || '',
        },
        administrator: {
          code: selectedRecord.ADM_CD || 'SING',
          number: selectedRecord.ADMIN_NO || '',
          name: selectedRecord.Administrator_Name || '',
          address: selectedRecord.Administrator_Address || '',
        }
      }));
    } else {
      setData(emptyData);
    }
  }, [selectedRecord]);

  const handleOwnerChange = (field: keyof OwnerData, value: string) => {
    setData(prev => {
        const newData = {
            ...prev,
            owner: { ...prev.owner, [field]: value },
        };
        
        // Propagate changes to parent
        if (onUpdate) {
            const updatePayload: any = {};
            // Map local state to parent record fields
            if (field === 'code') updatePayload.OWN_CD = value;
            if (field === 'number') updatePayload.OWNER_NO = value;
            if (field === 'name') updatePayload.owner = value;
            if (field === 'address') updatePayload.Owner_Address = value;
            
            onUpdate(updatePayload);
        }
        
        return newData;
    });
  };

  const handleAdminChange = (field: keyof OwnerData, value: string) => {
    setData(prev => {
        const newData = {
            ...prev,
            administrator: { ...prev.administrator, [field]: value },
        };

        // Propagate changes to parent
        if (onUpdate) {
            const updatePayload: any = {};
            if (field === 'code') updatePayload.ADM_CD = value;
            if (field === 'number') updatePayload.ADMIN_NO = value;
            if (field === 'name') updatePayload.Administrator_Name = value;
            if (field === 'address') updatePayload.Administrator_Address = value;
            
            onUpdate(updatePayload);
        }

        return newData;
    });
  };

  const inputClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const selectClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-green-50/30 dark:from-slate-800/50 dark:to-green-900/10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Section Header */}
      <div
        className="px-4 py-2.5 bg-primary"
      >
        
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <User size={16} />
          Property Owner and Administrator
        </h3>
      </div>

      {/* Form Content */}
      <div className="p-4">
        {/* Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 px-2">
          <div className="col-span-2"></div>
          <div className="col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Code</div>
          <div className="col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Number</div>
          <div className="col-span-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Name</div>
          <div className="col-span-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Address</div>
        </div>

        {/* Owner Row */}
        <div className="grid grid-cols-12 gap-2 items-center mb-3 p-2 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="col-span-2 flex items-center gap-2">
            <button
              disabled={!isEnabled}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title="Search Owner"
              data-testid="btn-search-owner"
            >
              <Search size={14} className="text-primary dark:text-primary/80" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Owner</span>
          </div>
          <div className="col-span-2">
            <select
              value={data.owner.code}
              onChange={(e) => handleOwnerChange('code', e.target.value)}
              disabled={!isEnabled}
              className={selectClass}
              data-testid="select-owner-code"
            >
              {codeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <input
              type="text"
              value={data.owner.number}
              onChange={(e) => handleOwnerChange('number', e.target.value)}
              disabled={!isEnabled}
              className={`${inputClass} font-mono`}
              data-testid="input-owner-number"
            />
          </div>
          <div className="col-span-3">
            <input
              type="text"
              value={data.owner.name}
              onChange={(e) => handleOwnerChange('name', e.target.value)}
              disabled={!isEnabled}
              className={inputClass}
              data-testid="input-owner-name"
            />
          </div>
          <div className="col-span-3">
            <input
              type="text"
              value={data.owner.address}
              onChange={(e) => handleOwnerChange('address', e.target.value)}
              disabled={!isEnabled}
              className={inputClass}
              data-testid="input-owner-address"
            />
          </div>
        </div>

        {/* Administrator Row */}
        <div className="grid grid-cols-12 gap-2 items-center p-2 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="col-span-2 flex items-center gap-2">
            <button
              disabled={!isEnabled}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title="Search Administrator"
              data-testid="btn-search-admin"
            >
              <Search size={14} className="text-primary dark:text-primary/80" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Administrator</span>
          </div>
          <div className="col-span-2">
            <select
              value={data.administrator.code}
              onChange={(e) => handleAdminChange('code', e.target.value)}
              disabled={!isEnabled}
              className={selectClass}
              data-testid="select-admin-code"
            >
              {codeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <input
              type="text"
              value={data.administrator.number}
              onChange={(e) => handleAdminChange('number', e.target.value)}
              disabled={!isEnabled}
              className={`${inputClass} font-mono`}
              data-testid="input-admin-number"
            />
          </div>
          <div className="col-span-3">
            <input
              type="text"
              value={data.administrator.name}
              onChange={(e) => handleAdminChange('name', e.target.value)}
              disabled={!isEnabled}
              className={inputClass}
              data-testid="input-admin-name"
            />
          </div>
          <div className="col-span-3">
            <input
              type="text"
              value={data.administrator.address}
              onChange={(e) => handleAdminChange('address', e.target.value)}
              disabled={!isEnabled}
              className={inputClass}
              data-testid="input-admin-address"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOwnerSection;
