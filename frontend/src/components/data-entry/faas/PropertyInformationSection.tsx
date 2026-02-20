import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface PropertyRecord {
  id: string;
  tdn: string;
  arp: string;
  pin: string;
  ownerNo: string;
  owner: string;
}

interface PropertyInformationSectionProps {
  isEnabled: boolean;
  selectedRecord: PropertyRecord | null;
}

interface PropertyInfoData {
  effectivityDate: string;
  declarationDate: string;
  cancelledDate: string;
  district: string;
  barangay: string;
  barangayName: string;
  ccn: string;
  motherTdn: boolean;
  tdNo: string;
  arpNo: string;
  propertyIndexNo: string;
  improvementNo: string;
  buildingName: string;
  buildingUnit: string;
  updateCode: string;
  updateCodeDesc: string;
  tctOctCct: string;
  tctDate: string;
  cadLotNo: string;
  surveyNo: string;
  blockNo: string;
  lotNo: string;
}

const defaultData: PropertyInfoData = {
  effectivityDate: '2026-01-01',
  declarationDate: '2025-01-14',
  cancelledDate: '',
  district: '00',
  barangay: '001',
  barangayName: 'POBLACION',
  ccn: '',
  motherTdn: false,
  tdNo: '25-07-0001-00006',
  arpNo: '25-07-0001-00006',
  propertyIndexNo: '053-07-0001-002-03',
  improvementNo: '',
  buildingName: '',
  buildingUnit: '',
  updateCode: 'GR',
  updateCodeDesc: 'GENERAL REVISION',
  tctOctCct: 'KOT BLG. P-20087 KALOOB NA PATI',
  tctDate: '',
  cadLotNo: '92-A, CAD 668',
  surveyNo: 'CSD-13-004840',
  blockNo: '',
  lotNo: 'LOT 3902',
};

const districtOptions = [
  { value: '00', label: '00' },
  { value: '01', label: '01' },
  { value: '02', label: '02' },
];

const barangayOptions = [
  { value: '001', label: '001', name: 'POBLACION' },
  { value: '002', label: '002', name: 'SAN ISIDRO' },
  { value: '003', label: '003', name: 'STO. ROSARIO' },
];

const updateCodeOptions = [
  { value: 'GR', label: 'GR', desc: 'GENERAL REVISION' },
  { value: 'TR', label: 'TR', desc: 'TRANSFER' },
  { value: 'SD', label: 'SD', desc: 'SUBDIVISION' },
  { value: 'CS', label: 'CS', desc: 'CONSOLIDATION' },
  { value: 'PC', label: 'PC', desc: 'PHYSICAL CHANGE' },
  { value: 'DP', label: 'DP', desc: 'DISPUTE' },
  { value: 'CC', label: 'CC', desc: 'CORRECTION OF CLERICAL ERROR' },
];

const PropertyInformationSection: React.FC<PropertyInformationSectionProps> = ({
  isEnabled,
  selectedRecord,
}) => {
  const [data, setData] = useState<PropertyInfoData>(defaultData);

  const handleChange = (field: keyof PropertyInfoData, value: string | boolean) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update barangay name
      if (field === 'barangay') {
        const bgy = barangayOptions.find(b => b.value === value);
        if (bgy) newData.barangayName = bgy.name;
      }
      
      // Auto-update update code description
      if (field === 'updateCode') {
        const code = updateCodeOptions.find(c => c.value === value);
        if (code) newData.updateCodeDesc = code.desc;
      }
      
      return newData;
    });
  };

  const inputClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const selectClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Section Header */}
      <div className="bg-blue-600 dark:bg-blue-700 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar size={16} />
          Property Information
        </h3>
      </div>

      {/* Form Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          {/* Column 1 - Dates and Location */}
          <div className="space-y-3">
            {/* Effectivity Date */}
            <div>
              <label className={labelClass}>Effectivity Date:</label>
              <input
                type="date"
                value={data.effectivityDate}
                onChange={(e) => handleChange('effectivityDate', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-effectivity-date"
              />
            </div>

            {/* Declaration Date */}
            <div>
              <label className={labelClass}>Declaration Date:</label>
              <input
                type="date"
                value={data.declarationDate}
                onChange={(e) => handleChange('declarationDate', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-declaration-date"
              />
            </div>

            {/* Cancelled Date */}
            <div>
              <label className={labelClass}>Cancelled Date:</label>
              <input
                type="date"
                value={data.cancelledDate}
                onChange={(e) => handleChange('cancelledDate', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-cancelled-date"
              />
            </div>

            {/* District */}
            <div>
              <label className={labelClass}>District:</label>
              <select
                value={data.district}
                onChange={(e) => handleChange('district', e.target.value)}
                disabled={!isEnabled}
                className={selectClass}
                data-testid="select-district"
              >
                {districtOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Barangay */}
            <div>
              <label className={labelClass}>Barangay:</label>
              <div className="flex gap-2">
                <select
                  value={data.barangay}
                  onChange={(e) => handleChange('barangay', e.target.value)}
                  disabled={!isEnabled}
                  className={`${selectClass} w-20`}
                  data-testid="select-barangay"
                >
                  {barangayOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={data.barangayName}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-medium"
                  data-testid="display-barangay-name"
                />
              </div>
            </div>

            {/* CCN */}
            <div>
              <label className={labelClass}>CCN:</label>
              <select
                value={data.ccn}
                onChange={(e) => handleChange('ccn', e.target.value)}
                disabled={!isEnabled}
                className={selectClass}
                data-testid="select-ccn"
              >
                <option value="">Select CCN</option>
              </select>
            </div>

            {/* Mother TDN */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="motherTdn"
                checked={data.motherTdn}
                onChange={(e) => handleChange('motherTdn', e.target.checked)}
                disabled={!isEnabled}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                data-testid="checkbox-mother-tdn"
              />
              <label htmlFor="motherTdn" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mother TDN
              </label>
            </div>
          </div>

          {/* Column 2 - Numbers and Building */}
          <div className="space-y-3">
            {/* T.D. No. */}
            <div>
              <label className={labelClass}>T.D. No.:</label>
              <input
                type="text"
                value={data.tdNo}
                onChange={(e) => handleChange('tdNo', e.target.value)}
                disabled={!isEnabled}
                className={`${inputClass} font-mono`}
                data-testid="input-td-no"
              />
            </div>

            {/* A.R.P. No. */}
            <div>
              <label className={labelClass}>A.R.P. No.:</label>
              <input
                type="text"
                value={data.arpNo}
                onChange={(e) => handleChange('arpNo', e.target.value)}
                disabled={!isEnabled}
                className={`${inputClass} font-mono`}
                data-testid="input-arp-no"
              />
            </div>

            {/* Property Index No. */}
            <div>
              <label className={labelClass}>Property Index No.:</label>
              <input
                type="text"
                value={data.propertyIndexNo}
                onChange={(e) => handleChange('propertyIndexNo', e.target.value)}
                disabled={!isEnabled}
                className={`${inputClass} font-mono`}
                data-testid="input-property-index-no"
              />
            </div>

            {/* Improvement No. */}
            <div>
              <label className={labelClass}>Improvement No.:</label>
              <select
                value={data.improvementNo}
                onChange={(e) => handleChange('improvementNo', e.target.value)}
                disabled={!isEnabled}
                className={selectClass}
                data-testid="select-improvement-no"
              >
                <option value="">Select</option>
              </select>
            </div>

            {/* Building Name */}
            <div>
              <label className={labelClass}>Building Name:</label>
              <select
                value={data.buildingName}
                onChange={(e) => handleChange('buildingName', e.target.value)}
                disabled={!isEnabled}
                className={selectClass}
                data-testid="select-building-name"
              >
                <option value="">Select</option>
              </select>
            </div>

            {/* Building Unit */}
            <div>
              <label className={labelClass}>Building Unit:</label>
              <select
                value={data.buildingUnit}
                onChange={(e) => handleChange('buildingUnit', e.target.value)}
                disabled={!isEnabled}
                className={selectClass}
                data-testid="select-building-unit"
              >
                <option value="">Select</option>
              </select>
            </div>
          </div>

          {/* Column 3 - Update Code and Survey Info */}
          <div className="space-y-3">
            {/* Update Code */}
            <div>
              <label className={labelClass}>Update Code:</label>
              <div className="flex gap-2">
                <select
                  value={data.updateCode}
                  onChange={(e) => handleChange('updateCode', e.target.value)}
                  disabled={!isEnabled}
                  className={`${selectClass} w-20`}
                  data-testid="select-update-code"
                >
                  {updateCodeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={data.updateCodeDesc}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-medium"
                  data-testid="display-update-code-desc"
                />
              </div>
            </div>

            {/* TCT / OCT / CCT */}
            <div>
              <label className={labelClass}>TCT / OCT / CCT:</label>
              <input
                type="text"
                value={data.tctOctCct}
                onChange={(e) => handleChange('tctOctCct', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-tct-oct-cct"
              />
            </div>

            {/* TCT Date */}
            <div>
              <label className={labelClass}>TCT Date:</label>
              <input
                type="date"
                value={data.tctDate}
                onChange={(e) => handleChange('tctDate', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-tct-date"
              />
            </div>

            {/* Cad. Lot No. */}
            <div>
              <label className={labelClass}>Cad. Lot No.:</label>
              <input
                type="text"
                value={data.cadLotNo}
                onChange={(e) => handleChange('cadLotNo', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-cad-lot-no"
              />
            </div>

            {/* Survey No. */}
            <div>
              <label className={labelClass}>Survey No.:</label>
              <input
                type="text"
                value={data.surveyNo}
                onChange={(e) => handleChange('surveyNo', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-survey-no"
              />
            </div>

            {/* Block No. */}
            <div>
              <label className={labelClass}>Block No.:</label>
              <input
                type="text"
                value={data.blockNo}
                onChange={(e) => handleChange('blockNo', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-block-no"
              />
            </div>

            {/* Lot No. */}
            <div>
              <label className={labelClass}>Lot No.:</label>
              <input
                type="text"
                value={data.lotNo}
                onChange={(e) => handleChange('lotNo', e.target.value)}
                disabled={!isEnabled}
                className={inputClass}
                data-testid="input-lot-no"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyInformationSection;
