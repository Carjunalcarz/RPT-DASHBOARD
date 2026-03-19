import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { getFaasTdnHistory, FaasTdnHistoryRow } from '@/services/faasService';
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
  const { headerColor, headerColorDark } = useThemeColor();
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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{
          background: 'var(--header-gradient)',
          ['--header-gradient' as any]: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="--header-gradient"] {
              --header-gradient: linear-gradient(to right, ${headerColorDark}, ${headerColorDark}dd) !important;
            }
          }
        `}</style>
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">PREVIOUS TDN</h2>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead
            className="text-white"
            style={{
              backgroundColor: 'var(--table-header-bg)',
              ['--table-header-bg' as any]: headerColor,
            }}
          >
            <style>{`
              @media (prefers-color-scheme: dark) {
                .dark thead[style*="--table-header-bg"] {
                  --table-header-bg: ${headerColorDark} !important;
                }
              }
            `}</style>
            <tr>
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
                <td colSpan={8} className="px-2 py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  Loading previous TDN records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
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
                        ? 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <td className={`px-2 py-2 font-mono border-r border-slate-200 dark:border-slate-700 ${isActive ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <span>{record.tdn}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {statusLabel}
                        </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.previousTdn}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.pin}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.effectivityDate}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.ownerCode}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.declaredOwner}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.prevMarketValue}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{record.prevAssessedValue}</td>
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
