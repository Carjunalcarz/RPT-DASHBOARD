import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cleanPin } from '../utils';
import { getMunicipalities, Municipality } from '@/services/landTaxService';
import { getBarangays, BarangayRecord } from '@/modules/rptas/shared/services/barangayService';

interface PropertyRecord {
  id: string;
  tdn: string;
  arp: string;
  pin: string;
  TDN?: string;
  ARP?: string;
  PIN?: string;
  ownerNo: string;
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
  const [data, setData] = useState<PropertyInfoData>(defaultData);
  const [municipalityOptions, setMunicipalityOptions] = useState<Municipality[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<Array<{ code: string; name: string }>>([]);

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
    // Reset to empty data on mount if no record selected
    if (!selectedRecord) {
      setData(emptyData);
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (selectedRecord) {
      setData(prev => {
        const city = String((selectedRecord as any).CITY || (selectedRecord as any).cityCode || '').trim();
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
          barangay: String(selectedRecord.BCODE || (selectedRecord as any).barangayCode || '').trim(),
          barangayName: (() => {
            const value = String(selectedRecord.BARANGAY || (selectedRecord as any).barangay || '').trim();
            return value.toUpperCase() === 'N/A' ? '' : value;
          })(),
          ccn: selectedRecord.CCN || '',
          // motherTdn: !!selectedRecord.MTDN, // Logic unclear, leaving as is or default
          tdNo: selectedRecord.tdn || '',
          arpNo: selectedRecord.arp || '',
          propertyIndexNo: cleanPin(selectedRecord.pin || ''),
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
    // Remove non-alphanumeric chars to process raw input
    const raw = value.replace(/[^a-zA-Z0-9]/g, '');
    
    // Format: YY-CC-BBBB-SSSSS
    // Example: 22-01-0001-00088
    
    if (raw.length <= 2) return raw;
    if (raw.length <= 4) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    if (raw.length <= 8) return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 13)}`;
  };

  const handleChange = (field: keyof PropertyInfoData, value: string | boolean) => {
    setData(prev => {
      let finalValue = value;
      
      // Apply auto-formatting for TDN
      if (field === 'tdNo' && typeof value === 'string') {
          finalValue = formatTdn(value);
      }

      // Apply cleaning for PIN
      if (field === 'propertyIndexNo' && typeof value === 'string') {
          finalValue = cleanPin(value);
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
      // Rule: Prefix = (Year - 2001) or specific mapping.
      // User requirement: 2026 -> 25. 2023 -> 22.
      // Formula: (Year % 100) - 1.
      if (field === 'effectivityDate' && typeof value === 'string' && value) {
          const year = parseInt(value.split('-')[0], 10);
          if (!isNaN(year)) {
              const prefix = ((year % 100) - 1).toString().padStart(2, '0');
              
              // If isAdding (new record), always update
              // If !isAdding (editing), only update if prefix actually changed
              // This prevents unnecessary updates but enforces the rule if date changes
              
              if (isAdding) {
                  // Standard logic for new record
                  if (newData.tdNo && newData.tdNo.length >= 2) {
                      newData.tdNo = prefix + newData.tdNo.substring(2);
                  } else if (!newData.tdNo) {
                      newData.tdNo = prefix + '-';
                  }
                  
                  if (newData.arpNo && newData.arpNo.length >= 2) {
                      newData.arpNo = prefix + newData.arpNo.substring(2);
                  } else if (!newData.arpNo) {
                      newData.arpNo = prefix + '-';
                  }
              } else if (isEnabled) {
                  // Logic for editing existing record (via transaction)
                  // Only update if prefix is different to avoid jitter
                  if (newData.tdNo && newData.tdNo.length >= 2) {
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
      }
      
      // Auto-sync ARP when TDN changes
      if (field === 'tdNo' && typeof finalValue === 'string') {
          // If ARP is empty or user wants them synced, update ARP too
          // Or just enforce it always? "TDN and ARP is same"
          // Let's enforce it.
          newData.arpNo = finalValue;
      }
      
      // Auto-update update code description
      if (field === 'updateCode') {
        const code = updateCodeOptions.find(c => c.value === value);
        if (code) newData.updateCodeDesc = code.desc;
      }
      
      // Propagate changes to parent
      if (onUpdate) {
        const effYear = newData.effectivityDate ? newData.effectivityDate.split('-')[0] : '';
        const tdnPrefix = newData.tdNo ? newData.tdNo.split('-')[0] : '';
        const prefixAsNumber = Number.parseInt(tdnPrefix, 10);
        const derivedYear = Number.isNaN(prefixAsNumber) ? '' : String(2001 + prefixAsNumber);
        const nextTaxBegYear = effYear || derivedYear;
        const payload: Partial<PropertyRecord> = {
            EFF_DATE: newData.effectivityDate,
            DEC_DATE: newData.declarationDate,
            EFF_CANC: newData.cancelledDate,
            DIST_NO: newData.district,
            CITY: newData.city,
            BCODE: newData.barangay,
            BARANGAY: newData.barangayName,
            CCN: newData.ccn,
            TDN: newData.tdNo,
            ARP: newData.arpNo,
            PIN: newData.propertyIndexNo,
            tdn: newData.tdNo,
            arp: newData.arpNo,
            pin: newData.propertyIndexNo,
            IMP_NO: newData.improvementNo,
            BLDGNAME: newData.buildingName,
            BLDGUNIT: newData.buildingUnit,
            TRANS_CD: newData.updateCode,
            CER_TIT_NO: newData.tctOctCct,
            TCT_DATE: newData.tctDate,
            CAD_LOT_NO: newData.cadLotNo,
            ASS_LOT_NO: newData.surveyNo,
            BLOCK_NO: newData.blockNo,
            LOTE_NO: newData.lotNo,
        };

        if (nextTaxBegYear) {
          (payload as any).TAX_BEG_YR = nextTaxBegYear;
        }

        onUpdate(payload);
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

  const labelClass = "block text-xs font-medium text-muted dark:text-muted mb-1";

  return (
    <div className="bg-gradient-to-br from-background to-primary/5 dark:from-background/50 dark:to-primary/10 rounded-xl border border-border dark:border-border overflow-hidden">
      {/* Section Header */}
      <div
        className="px-4 py-2.5 bg-primary"
      >
        
        <h3 className="text-sm font-semibold text-surface flex items-center gap-2">
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
                  className="flex-1 px-3 py-2 text-xs bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded-lg font-medium shadow-sm cursor-not-allowed"
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
                  className="flex-1 px-3 py-2 text-xs bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded-lg font-medium shadow-sm cursor-not-allowed"
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
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                data-testid="checkbox-mother-tdn"
              />
              <label htmlFor="motherTdn" className="text-xs font-medium text-foreground dark:text-foreground">
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
                disabled={!isEnabled || (!isAdding && isEnabled)}
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
                  className="flex-1 px-3 py-2 text-xs bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded-lg font-medium"
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
