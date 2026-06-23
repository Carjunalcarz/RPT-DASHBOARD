import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Building2, TreePine, Cog, Loader2 } from 'lucide-react';
import { BuildingAssessment } from '../building';
import { LandAssessment } from '../land';
import { MachineryAssessment } from '../machinery';
import { RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';
import { usePrefetchActualUseOrdinances } from '@/modules/rptas/domains/RPT-management/queries/actualUseOrdinancesQuery';

interface AssessmentSectionProps {
  dataSource?: 'mssql' | 'supabase';
  isEnabled?: boolean;
  assessmentRecords?: RptAssRecord[];
  isLoading?: boolean;
  onUpdate?: (updatedRecords: RptAssRecord[]) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onRefresh?: () => void;
  onPrint?: () => void;
  trees?: any[];
  status?: string;
  transactionCode?: string;
  tdn?: string;
}

type AssessmentType = 'land' | 'building' | 'machinery';

const AssessmentSection: React.FC<AssessmentSectionProps> = ({
  dataSource = 'mssql',
  isEnabled,
  assessmentRecords = [],
  isLoading = false,
  onUpdate,
  onEditModeChange,
  onRefresh,
  onPrint,
  trees = [],
  status,
  transactionCode,
  tdn,
}) => {
  const [activeType, setActiveType] = useState<AssessmentType>('land'); // Default to land as it's often the base
  const userSelectedTypeRef = useRef(false);
  usePrefetchActualUseOrdinances();

  const normalizeToRptAss = (record: any, index: number): RptAssRecord => {
    const normalizeKind = (value: any): string => {
      const v = String(value ?? '').trim().toLowerCase();
      if (v === 'l' || v === 'land') return 'L';
      if (v === 'b' || v === 'building') return 'B';
      if (v === 'm' || v === 'machinery') return 'M';
      return String(value ?? '');
    };

    if (record?.KIND) {
      return { ...record, KIND: normalizeKind(record.KIND) } as RptAssRecord;
    }

    const tdnValue = record?.TDN ?? record?.tdn ?? record?.Sub_Tdn ?? record?.subTdn ?? '';
    const kind = normalizeKind(record?.kind ?? record?.KIND ?? record?.Kind);
    const marketVal =
      record?.MARKET_VAL ??
      record?.marketValue ??
      record?.adjustedMarketValue ??
      record?.baseMarketValue ??
      0;

    const idSource =
      record?.id ??
      `${String(tdnValue)}-${String(kind)}-${String(record?.CLASSIFICATION ?? record?.classification ?? '')}-${String(record?.ACTUAL_USE ?? record?.actualUse ?? '')}-${String(record?.SUB_CLASS ?? record?.subClass ?? '')}-${index}`;
    const uniqueIdSource = record?.uniqueId ?? idSource;

    return {
      TDN: String(tdnValue),
      REGION: String(record?.REGION ?? ''),
      PROV: String(record?.PROV ?? ''),
      CITY: String(record?.CITY ?? ''),
      DISTRICT: String(record?.DISTRICT ?? ''),
      KIND: kind,
      CLASSIFICATION: String(record?.CLASSIFICATION ?? record?.classification ?? ''),
      ACTUAL_USE: String(record?.ACTUAL_USE ?? record?.actualUse ?? ''),
      SUB_CLASS: String(record?.SUB_CLASS ?? record?.subClass ?? ''),
      EFF_DATE: String(record?.EFF_DATE ?? record?.effDate ?? ''),
      FOR_YEAR: Number(record?.FOR_YEAR ?? record?.forYear ?? 0),
      AREA: Number(record?.AREA ?? record?.area ?? 0),
      IF_DEFAULT: Boolean(record?.IF_DEFAULT ?? record?.ifDefault ?? true),
      UNIT_VALUE: Number(record?.UNIT_VALUE ?? record?.unitValue ?? 0),
      MARKET_VAL: Number(marketVal ?? 0),
      OLD_MVAL: Number(record?.OLD_MVAL ?? record?.baseMarketValue ?? 0),
      ASS_LEVEL: Number(record?.ASS_LEVEL ?? record?.assessmentLevel ?? 0),
      TAXABLE_RATE: Number(record?.TAXABLE_RATE ?? (record?.taxable ? 1 : 0)),
      ASS_VALUE: Number(record?.ASS_VALUE ?? record?.assessedValue ?? 0),
      TAXABILITY: String(
        record?.TAXABILITY ??
          (record?.taxable === true ? 'TAXABLE' : 'EXEMPT')
      ),
      BU: String(record?.BU ?? (record?.beneficialUse ? '1' : '0')),
      SQAREA: Number(record?.SQAREA ?? 0),
      IdleLand: Boolean(record?.IdleLand ?? record?.idleLand ?? false),
      LinearUnit: String(record?.LinearUnit ?? record?.linearUnit ?? ''),
      LegalBasis: String(record?.LegalBasis ?? ''),
      ISGREATERAREA: Boolean(record?.ISGREATERAREA ?? false),
      ISGREATERAREA_WAU: Boolean(record?.ISGREATERAREA_WAU ?? false),
      Length: Number(record?.Length ?? 0),
      sqDecimeter: Number(record?.sqDecimeter ?? 0),
      Sub_Tdn: String(record?.Sub_Tdn ?? ''),
      LAND_DESC: String(record?.LAND_DESC ?? ''),
      Disposal_Mvalue: Number(record?.Disposal_Mvalue ?? 0),
      WIDTH: Number(record?.WIDTH ?? 0),
      TOTALDIRECTCOST: Number(record?.TOTALDIRECTCOST ?? 0),
      ACTUALCUT: String(record?.ACTUALCUT ?? ''),
      MVALTIMBER: Number(record?.MVALTIMBER ?? 0),
      AREACOVERED: Number(record?.AREACOVERED ?? 0),
      TOTALCONS: Number(record?.TOTALCONS ?? 0),
      AREACOVEREDMUN: Number(record?.AREACOVEREDMUN ?? 0),
      PERCENTAREA: Number(record?.PERCENTAREA ?? 0),
      MARKETVALMUN: Number(record?.MARKETVALMUN ?? 0),
      IDLE_DECDATE: String(record?.IDLE_DECDATE ?? ''),
      IDLE_DATEEFF: String(record?.IDLE_DATEEFF ?? ''),
      IDLE_UNLISTED: Boolean(record?.IDLE_UNLISTED ?? false),
      IDLE_USERNAME: String(record?.IDLE_USERNAME ?? ''),
      DIRECTLOGCOST: Number(record?.DIRECTLOGCOST ?? 0),
      DOMEPRICELOG: Number(record?.DOMEPRICELOG ?? 0),
      id: idSource,
      uniqueId: uniqueIdSource,
      trees: record?.trees,
      ...(record?.adjustments ? { adjustments: record.adjustments } : {}),
    } as any;
  };

  const normalizedRecords = useMemo(() => {
    return (assessmentRecords || []).map(normalizeToRptAss);
  }, [assessmentRecords]);

  const landRecords = useMemo(() => {
    return normalizedRecords
      .filter((r) => r.KIND === 'L')
      .map((land) => {
        if ((land as any).trees && (land as any).trees.length > 0) return land;
        const matchingTrees = (trees || []).filter((t: any) => t?.TDN === (land as any).TDN);
        return { ...land, trees: matchingTrees.length > 0 ? matchingTrees : [] } as any;
      });
  }, [normalizedRecords, trees]);

  const buildingRecords = useMemo(() => {
    return normalizedRecords.filter((r) => r.KIND === 'B');
  }, [normalizedRecords]);

  const machineryRecords = useMemo(() => {
    return normalizedRecords.filter((r) => r.KIND === 'M');
  }, [normalizedRecords]);

  const handleUpdate = (type: AssessmentType, updatedTypeRecords: any[]) => {
    if (!onUpdate) return;

    const otherRecords =
      type === 'land'
        ? normalizedRecords.filter((r) => r.KIND !== 'L')
        : type === 'building'
          ? normalizedRecords.filter((r) => r.KIND !== 'B')
          : normalizedRecords.filter((r) => r.KIND !== 'M');

    const mappedUpdated = (updatedTypeRecords || []).map(normalizeToRptAss);

    const merged = [...otherRecords, ...mappedUpdated] as RptAssRecord[];
    onUpdate(merged);
  };

  // Auto-switch tab based on available data or first record
  useEffect(() => {
    if (userSelectedTypeRef.current) return;
    if (normalizedRecords.length > 0 && !isLoading) {
      // Logic: If we have specific records, switch to that tab.
      // If we have mixed, prioritize: Land -> Building -> Machinery
      // Or just switch to the type of the first record if we want to show what was clicked/loaded.
      
      const firstRecord = normalizedRecords[0];
      const kind = firstRecord.KIND;
      
      if (kind === 'L') {
        setActiveType('land');
      } else if (kind === 'B') {
        setActiveType('building');
      } else if (kind === 'M') {
        setActiveType('machinery');
      }
    } else {
        // Optional: If no records, maybe default to land or stay?
        // Let's keep current selection or default to land.
    }
  }, [isLoading, normalizedRecords]);

  return (
    <div className="space-y-4">
      {/* Assessment Type Selector */}
      <div className="bg-transparent rounded-lg p-2 flex gap-2">
        <button
          onClick={() => {
            userSelectedTypeRef.current = true;
            setActiveType('land');
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'land'
              ? 'bg-success text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-success/10 dark:hover:bg-green-900/20'
          } disabled:opacity-70 disabled:cursor-not-allowed`}
          disabled={isLoading}
          data-testid="assessment-type-land"
        >
          <TreePine size={16} />
          Land Assessment
          <Loader2 size={14} className={isLoading ? 'animate-spin' : 'invisible'} />
        </button>
        <button
          onClick={() => {
            userSelectedTypeRef.current = true;
            setActiveType('building');
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'building'
              ? 'bg-primary text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20'
          } disabled:opacity-70 disabled:cursor-not-allowed`}
          disabled={isLoading}
          data-testid="assessment-type-building"
        >
          <Building2 size={16} />
          Building Assessment
          <Loader2 size={14} className={isLoading ? 'animate-spin' : 'invisible'} />
        </button>
        <button
          onClick={() => {
            userSelectedTypeRef.current = true;
            setActiveType('machinery');
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeType === 'machinery'
              ? 'bg-orange-600 text-surface shadow-sm'
              : 'bg-surface dark:bg-muted/20 text-foreground dark:text-foreground hover:bg-warning/10 dark:hover:bg-orange-900/20'
          } disabled:opacity-70 disabled:cursor-not-allowed`}
          disabled={isLoading}
          data-testid="assessment-type-machinery"
        >
          <Cog size={16} />
          Machinery Assessment
          <Loader2 size={14} className={isLoading ? 'animate-spin' : 'invisible'} />
        </button>
      </div>

      {/* Assessment Content */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center p-8 bg-surface dark:bg-surface rounded-lg border border-border dark:border-border">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-3 text-sm text-muted dark:text-muted">Loading assessments...</span>
          </div>
        ) : (
          <>
            {activeType === 'land' && (
              <LandAssessment
                dataSource={dataSource}
                records={landRecords}
                isEnabled={isEnabled}
                tdn={tdn}
                onUpdate={(records) => handleUpdate('land', records)}
                onPrint={onPrint}
              />
            )}

            {activeType === 'building' && (
              <BuildingAssessment
                dataSource={dataSource} 
                records={buildingRecords}
                isEnabled={isEnabled}
                tdn={tdn}
                onUpdate={(records: any[]) => handleUpdate('building', records)}
                onPrint={onPrint}
              />
            )}

            {activeType === 'machinery' && (
              <MachineryAssessment 
                records={machineryRecords} 
                isEnabled={isEnabled}
                tdn={tdn}
                onUpdate={(records: any[]) => handleUpdate('machinery', records)}
                onPrint={onPrint}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssessmentSection;
