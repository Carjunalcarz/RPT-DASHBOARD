import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { getMunicipalities, Municipality } from '@/services/landTaxService';
import { getBarangays, BarangayRecord } from '@/modules/rptas/shared/services/barangayService';

interface PropertyRecord {
  id: string;
  TDN: string;
  ARP: string;
  PIN: string;
  OWNER_NO: string;
  owner: string;
  // Added fields for mapping
  EFF_DATE?: string;
  DEC_DATE?: string;
  EFF_CANC?: string; // Changed from CANC_DATE
  DIST_NO?: string;
  BCODE?: string; // Barangay Code
  BARANGAY?: string;
  CITY?: string;
  CCN?: string;
  MTDN?: string; // Mother TDN?
  IMP_NO?: string;
  BLDGNAME?: string;
  BLDGUNIT?: string;
  TRANS_CD?: string;
  CER_TIT_NO?: string;
  TCT_DATE?: string;
  CAD_LOT_NO?: string;
  ASS_LOT_NO?: string; // Survey No?
  BLOCK_NO?: string;
  LOTE_NO?: string;
  pOldTdn?: string;
}

interface PropertyInformationSectionProps {
  isEnabled: boolean;
  selectedRecord: PropertyRecord | null;
  onUpdate?: (updatedData: Partial<PropertyRecord>) => void;
  isAdding?: boolean;
}

interface PropertyInfoData {
  effectivityDate: string;
  declarationDate: string;
  cancelledDate: string;
  district: string;
  city: string;
  cityName: string;
  barangay: string;
  barangayName: string;
  ccn: string;
  motherTdn: boolean;
  tdNo: string;
  pOldTdn: string;
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
  effectivityDate: '',
  declarationDate: '',
  cancelledDate: '',
  district: '00',
  city: '',
  cityName: '',
  barangay: '',
  barangayName: '',
  ccn: '',
  motherTdn: false,
  tdNo: '',
  pOldTdn: '',
  arpNo: '',
  propertyIndexNo: '',
  improvementNo: '',
  buildingName: '',
  buildingUnit: '',
  updateCode: 'GR',
  updateCodeDesc: 'GENERAL REVISION',
  tctOctCct: '',
  tctDate: '',
  cadLotNo: '',
  surveyNo: '',
  blockNo: '',
  lotNo: '',
};

const districtOptions = [
  { value: '00', label: '00' },
  { value: '01', label: '01' },
  { value: '02', label: '02' },
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

const emptyData: PropertyInfoData = {
  effectivityDate: '',
  declarationDate: '',
  cancelledDate: '',
  district: '00',
  city: '',
  cityName: '',
  barangay: '',
  barangayName: '',
  ccn: '',
  motherTdn: false,
  tdNo: '',
  pOldTdn: '',
  arpNo: '',
  propertyIndexNo: '',
  improvementNo: '',
  buildingName: '',
  buildingUnit: '',
  updateCode: 'GR',
  updateCodeDesc: 'GENERAL REVISION',
  tctOctCct: '',
  tctDate: '',
  cadLotNo: '',
  surveyNo: '',
  blockNo: '',
  lotNo: '',
};

const PropertyInformationSection: React.FC<PropertyInformationSectionProps> = ({
  isEnabled,
  selectedRecord,
  onUpdate,
  isAdding = false
}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { user } = useAuth();
  const [data, setData] = useState<PropertyInfoData>(defaultData);
  const [municipalityOptions, setMunicipalityOptions] = useState<Municipality[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<Array<{ code: string; name: string }>>([]);

  // Check if current user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'Administrator';

  useEffect(() => {
    // Reset to empty data on mount if no record selected
    if (!selectedRecord) {
      setData(emptyData);
    }
  }, []); // Run once on mount

  useEffect(() => {
    let alive = true;
    getMunicipalities()
      .then((list) => {
        if (!alive) return;
        setMunicipalityOptions(list || []);
      })
      .catch(() => {
        if (!alive) return;
        setMunicipalityOptions([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const cityCode = String(data.city || '').trim();
    if (!cityCode) {
      setBarangayOptions([]);
      return;
    }
    getBarangays(1, 1000, undefined, cityCode)
      .then((res) => {
        if (!alive) return;
        const list = (res?.data || []) as BarangayRecord[];
        const mapped = list
          .map((b) => ({
            code: String(b.CODE || '').trim(),
            name: String(b.DESCRIPTION || '').trim(),
          }))
          .filter((b) => b.code && b.name);
        setBarangayOptions(mapped);
      })
      .catch(() => {
        if (!alive) return;
        setBarangayOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [data.city]);

  useEffect(() => {
    if (selectedRecord) {
      setData(prev => {
        const city = String((selectedRecord as any).CITY || '').trim();
        const cityName =
          municipalityOptions.find((m) => String(m.code || '').trim() === city)?.name || '';
        const newData = {
          ...prev,
          effectivityDate: selectedRecord.EFF_DATE ? selectedRecord.EFF_DATE.split('T')[0] : '',
          declarationDate: selectedRecord.DEC_DATE ? selectedRecord.DEC_DATE.split('T')[0] : '',
          cancelledDate: selectedRecord.EFF_CANC ? selectedRecord.EFF_CANC.split('T')[0] : '',
          district: selectedRecord.DIST_NO || '00',
          city,
          cityName,
          barangay: String(selectedRecord.BCODE || '').trim(),
          barangayName: (() => {
            const value = String(selectedRecord.BARANGAY || '').trim();
            return value.toUpperCase() === 'N/A' ? '' : value;
          })(),
          ccn: selectedRecord.CCN || '',
          // motherTdn: !!selectedRecord.MTDN, // Logic unclear, leaving as is or default
          tdNo: selectedRecord.TDN || '',
          pOldTdn: (selectedRecord as any).pOldTdn || '',
          arpNo: selectedRecord.TDN || '', // ARP should use CURRENT TDN
          propertyIndexNo: selectedRecord.PIN || '',
          improvementNo: selectedRecord.IMP_NO || '',
          buildingName: selectedRecord.BLDGNAME || '',
          buildingUnit: selectedRecord.BLDGUNIT || '',
          updateCode: selectedRecord.TRANS_CD || 'GR',
          tctOctCct: selectedRecord.CER_TIT_NO || '',
          tctDate: selectedRecord.TCT_DATE ? selectedRecord.TCT_DATE.split('T')[0] : '',
          cadLotNo: selectedRecord.CAD_LOT_NO || '',
          surveyNo: selectedRecord.ASS_LOT_NO || '',
          blockNo: selectedRecord.BLOCK_NO || '',
          lotNo: selectedRecord.LOTE_NO || '',
        };

        // Update description for updateCode
        const code = updateCodeOptions.find(c => c.value === newData.updateCode);
        if (code) newData.updateCodeDesc = code.desc;

        return newData;
      });
    } else {
      // Reset to empty data when no record is selected (Add Mode)
      setData(emptyData);
    }
  }, [municipalityOptions, selectedRecord]);

  useEffect(() => {
    if (!data.city || data.cityName) return;
    const name = municipalityOptions.find((m) => String(m.code || '').trim() === String(data.city || '').trim())?.name;
    if (!name) return;
    setData((prev) => ({ ...prev, cityName: name }));
  }, [data.city, data.cityName, municipalityOptions]);

  useEffect(() => {
    const current = String(data.barangayName || '').trim();
    if (!data.barangay || (current && current.toUpperCase() !== 'N/A')) return;
    const name = barangayOptions.find((b) => b.code === String(data.barangay || '').trim())?.name;
    if (!name) return;
    setData((prev) => ({ ...prev, barangayName: name }));
  }, [barangayOptions, data.barangay, data.barangayName]);

  // Auto-formatter for TDN
  const formatTdn = (value: string) => {
    const raw = value.replace(/[^a-zA-Z0-9]/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 4) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    if (raw.length <= 8) return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 13)}`;
  };

  const handleChange = (field: keyof PropertyInfoData, value: string | boolean) => {
    setData(prev => {
      let finalValue = value;
      
      if (field === 'tdNo' && typeof value === 'string') {
          finalValue = formatTdn(value);
      }

      const newData = { ...prev, [field]: finalValue };
      
      // Auto-update barangay name
      if (field === 'barangay') {
        const bgy = barangayOptions.find((b) => b.code === String(value || '').trim());
        newData.barangayName = bgy?.name || '';
      }

      if (field === 'city') {
        const code = String(value || '').trim();
        const muni = municipalityOptions.find((m) => String(m.code || '').trim() === code);
        newData.cityName = muni?.name || '';
        newData.barangay = '';
        newData.barangayName = '';
      }
      
      // Auto-update TDN prefix based on Effectivity Date
      // Only apply this logic if adding a NEW record. 
      // For edits, TDN should remain stable unless explicitly changed (which is locked anyway).
      if (isAdding && field === 'effectivityDate' && typeof value === 'string' && value) {
          const year = parseInt(value.split('-')[0], 10);
          if (!isNaN(year)) {
              // Rule: (Year % 100) - 1.
              // 2026 -> 25.
              const prefix = ((year % 100) - 1).toString().padStart(2, '0');
              
              if (newData.tdNo && newData.tdNo.length >= 2) {
                  newData.tdNo = prefix + newData.tdNo.substring(2);
              } else if (!newData.tdNo) {
                  newData.tdNo = prefix + '-';
              }

              // Also sync ARP
              if (newData.arpNo && newData.arpNo.length >= 2) {
                   newData.arpNo = prefix + newData.arpNo.substring(2);
              } else if (!newData.arpNo) {
                   newData.arpNo = prefix + '-';
              }
          }
      } else if (!isAdding && isEnabled && field === 'effectivityDate' && typeof value === 'string' && value) {
          // Rule for Editing: If effectivity date changes, update TDN prefix too
          // This applies when editing an existing record via Transaction (which sets isAdding=true usually, but just in case)
          // Actually, transactions usually set isAdding=true. 
          // If we are just editing a draft, isAdding might be false?
          // If isEnabled is true, we allow editing effectivity date.
          
          const year = parseInt(value.split('-')[0], 10);
          if (!isNaN(year)) {
              const prefix = ((year % 100) - 1).toString().padStart(2, '0');
              
              if (newData.tdNo && newData.tdNo.length >= 2) {
                  // Only update if prefix is different
                  if (newData.tdNo.substring(0, 2) !== prefix) {
                      newData.tdNo = prefix + newData.tdNo.substring(2);
                  }
              }
              
              if (newData.arpNo && newData.arpNo.length >= 2) {
                  if (newData.arpNo.substring(0, 2) !== prefix) {
                      newData.arpNo = prefix + newData.arpNo.substring(2);
                  }
              }
          }
      }

      // Auto-sync ARP when TDN changes
      if (field === 'tdNo' && typeof finalValue === 'string') {
          newData.arpNo = finalValue;
      }
      
      // Auto-sync TDN when ARP changes (per user request: TDN = ARP)
      if (field === 'arpNo' && typeof finalValue === 'string') {
          newData.tdNo = finalValue;
      }

      // Auto-update update code description
      if (field === 'updateCode') {
        const code = updateCodeOptions.find(c => c.value === value);
        if (code) newData.updateCodeDesc = code.desc;
      }
      
      // Propagate changes to parent
      if (onUpdate) {
          const updatePayload: any = {};
          
          if (field === 'effectivityDate') updatePayload.EFF_DATE = value as string;
          if (field === 'declarationDate') updatePayload.DEC_DATE = value as string;
          if (field === 'cancelledDate') updatePayload.EFF_CANC = value as string;
          if (field === 'district') updatePayload.DIST_NO = value as string;
          if (field === 'city') updatePayload.CITY = value as string;
          if (field === 'barangay') {
              updatePayload.BCODE = value as string;
              updatePayload.BARANGAY = newData.barangayName;
          }
          if (field === 'ccn') updatePayload.CCN = value as string;
          // if (field === 'motherTdn') updatePayload.MTDN = value as boolean;
          if (field === 'tdNo') updatePayload.TDN = finalValue as string;
          if (field === 'pOldTdn') updatePayload.pOldTdn = value as string;
          if (field === 'arpNo') updatePayload.ARP = finalValue as string;
          if (field === 'propertyIndexNo') updatePayload.PIN = value as string;
          if (field === 'improvementNo') updatePayload.IMP_NO = value as string;
          if (field === 'buildingName') updatePayload.BLDGNAME = value as string;
          if (field === 'buildingUnit') updatePayload.BLDGUNIT = value as string;
          if (field === 'updateCode') updatePayload.TRANS_CD = value as string;
          if (field === 'tctOctCct') updatePayload.CER_TIT_NO = value as string;
          if (field === 'tctDate') updatePayload.TCT_DATE = value as string;
          if (field === 'cadLotNo') updatePayload.CAD_LOT_NO = value as string;
          if (field === 'surveyNo') updatePayload.ASS_LOT_NO = value as string;
          if (field === 'blockNo') updatePayload.BLOCK_NO = value as string;
          if (field === 'lotNo') updatePayload.LOTE_NO = value as string;

          // Propagate dependent updates
          if (newData.tdNo !== prev.tdNo && field !== 'tdNo') updatePayload.TDN = newData.tdNo;
          if (newData.arpNo !== prev.arpNo && field !== 'arpNo') updatePayload.ARP = newData.arpNo;

          onUpdate(updatePayload);
      }

      return newData;
    });
  };

  const inputClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const selectClass = `w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all appearance-none ${
    !isEnabled ? 'bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''
  }`;

  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";

  return (
    <div className="bg-gradient-to-br from-slate-50 to-primary/5 dark:from-slate-800/50 dark:to-primary/10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Section Header */}
      <div
        className="px-4 py-2.5 bg-primary"
      >
        
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
                // Enable effectivity date editing even if not adding, as long as form is enabled
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

            {/* Municipality */}
            <div>
              <label className={labelClass}>Municipality:</label>
              <div className="flex gap-2">
                <select
                  value={data.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={!isEnabled}
                  className={`${selectClass} w-28`}
                  data-testid="select-municipality"
                >
                  <option value="">Select Municipality</option>
                  {municipalityOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={data.cityName}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-medium"
                  data-testid="display-municipality-name"
                />
              </div>
            </div>

            {/* Barangay */}
            <div>
              <label className={labelClass}>Barangay:</label>
              <div className="flex gap-2">
                <select
                  value={data.barangay}
                  onChange={(e) => handleChange('barangay', e.target.value)}
                  disabled={!isEnabled || !data.city}
                  className={`${selectClass} w-20`}
                  data-testid="select-barangay"
                >
                  <option value="">{data.city ? 'Select Barangay' : 'Select Municipality first'}</option>
                  {barangayOptions.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code}
                    </option>
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
                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/50"
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
                // Disabled if not enabled OR (if it's not adding AND user is admin - TDN shouldn't be editable by admin in edit mode)
                // Actually, request says "PIN and TDN must NOT be editable in the admin edit page".
                // They can only be changed through transaction.
                // So if it's existing record (not isAdding), it should be disabled.
                disabled={!isEnabled || (!isAdding && isEnabled)}
                className={`${inputClass} font-mono`}
                data-testid="input-td-no"
              />
            </div>

            {/* OLD T.D. No. */}
            <div>
              <label className={labelClass}>OLD T.D. No.:</label>
              <input
                type="text"
                value={data.pOldTdn}
                onChange={(e) => handleChange('pOldTdn', e.target.value)}
                disabled={!isEnabled || (!isAdding && isEnabled)}
                className={`${inputClass} font-mono`}
                data-testid="input-p-old-tdn"
              />
            </div>

            {/* A.R.P. No. */}
            <div>
              <label className={labelClass}>A.R.P. No.:</label>
              <input
                type="text"
                value={data.arpNo}
                onChange={(e) => handleChange('arpNo', e.target.value)}
                disabled={!isEnabled || (!isAdding && isEnabled)}
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
                // PIN disabled in edit mode for admin
                disabled={!isEnabled || (!isAdding && isEnabled)}
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
