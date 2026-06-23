import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { getFaasTdnHistory, FaasTdnHistoryRow } from '@/modules/rptas/shared/services/faasService';
import { PropertyRecord } from './types';

interface PreviousTDN {
  id: string;
  tdn: string;
  previousTdn: string;
  pin: string;
  effectivityDate: string;
  ownerCode: string;
  declaredOwner: string;
  prevMarketValue: string;
  prevAssessedValue: string;
  isCurrent: boolean;
}

interface PreviousTDNsSectionProps {
  selectedRecord: PropertyRecord | null;
}

const PreviousTDNsSection: React.FC<PreviousTDNsSectionProps> = ({ selectedRecord }) => {
  const [records, setRecords] = useState<PreviousTDN[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = selectedRecord?.id;
    if (!id) {
      setRecords([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const rows: FaasTdnHistoryRow[] = await getFaasTdnHistory(id);
        const fmt = (v: number) => `₱${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const mapped = rows.map((r) => ({
            id: r.id,
            tdn: r.tdn || '',
            previousTdn: r.previousTdn || '',
            pin: r.pin || selectedRecord.PIN || '',
            effectivityDate: r.effectivityDate || (r.taxBegYear ? `01/01/${r.taxBegYear}` : ''),
            ownerCode: r.ownerCode || selectedRecord.pOwnerCode || selectedRecord.OWNER_NO || '',
            declaredOwner: r.declaredOwner || selectedRecord.owner || '',
            prevMarketValue: fmt(r.prevMarketValue),
            prevAssessedValue: fmt(r.prevAssessedValue),
            isCurrent: !!r.isCurrent,
        }));

        mapped.sort((a, b) => {
          const ay = parseInt(a.effectivityDate.slice(0, 4), 10);
          const by = parseInt(b.effectivityDate.slice(0, 4), 10);
          if (!Number.isNaN(ay) && !Number.isNaN(by) && ay !== by) return by - ay;
          return b.effectivityDate.localeCompare(a.effectivityDate);
        });

        setRecords(mapped);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedRecord?.id]);

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border">
      {/* Header */}
      <div className="px-4 py-3 rounded-t-lg bg-primary">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-surface" />
          <h2 className="text-base font-semibold text-surface">PREVIOUS TDN</h2>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead
            className="text-surface bg-primary"
          >
            <tr className="text-surface">
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">TDN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Previous TDN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">PIN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Effectivity Date</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Owner Code</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Declared Owner</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Prev. Market Value</th>
              <th className="px-2 py-2 text-right font-medium">Prev. Assessed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-2 py-12 text-center text-muted dark:text-muted text-xs">
                  Loading previous TDN records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-12 text-center text-muted dark:text-muted text-xs">
                  No previous TDN records found.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                (() => {
                  const isActive = index === 0;
                  const statusLabel = isActive ? 'Active' : 'Cancelled';
                  return (
                <tr
                  key={record.id}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      : index % 2 === 0
                        ? 'bg-background dark:bg-background/30 hover:bg-primary/10 dark:hover:bg-primary/20'
                        : 'bg-surface dark:bg-surface hover:bg-primary/10 dark:hover:bg-primary/20'
                  }`}
                >
                  <td className={`px-2 py-2 font-mono border-r border-border dark:border-border ${isActive ? 'text-emerald-800 dark:text-emerald-200' : 'text-foreground dark:text-foreground'}`}>
                    <div className="flex items-center gap-2">
                      <span>{record.tdn}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200'
                            : 'bg-muted/10 dark:bg-background text-muted dark:text-foreground'
                        }`}
                      >
                        {statusLabel}
                        </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-foreground dark:text-foreground border-r border-border dark:border-border">{record.previousTdn}</td>
                  <td className="px-2 py-2 font-mono text-foreground dark:text-foreground border-r border-border dark:border-border">{record.pin}</td>
                  <td className="px-2 py-2 text-foreground dark:text-foreground border-r border-border dark:border-border">{record.effectivityDate}</td>
                  <td className="px-2 py-2 text-foreground dark:text-foreground border-r border-border dark:border-border">{record.ownerCode}</td>
                  <td className="px-2 py-2 text-foreground dark:text-foreground border-r border-border dark:border-border">{record.declaredOwner}</td>
                  <td className="px-2 py-2 text-right font-mono text-foreground dark:text-foreground border-r border-border dark:border-border">{record.prevMarketValue}</td>
                  <td className="px-2 py-2 text-right font-mono text-foreground dark:text-foreground">{record.prevAssessedValue}</td>
                </tr>
                  );
                })()
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreviousTDNsSection;
