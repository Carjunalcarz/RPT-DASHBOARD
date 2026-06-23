import React, { forwardRef } from 'react';

export interface ReceiptProperty {
  tdn?: string | null;
  pin?: string | null;
  ownerName?: string | null;
  municipality?: string | null;
  barangay?: string | null;
  taxBegYr?: string | null;
  assValue?: number | null;
}

export interface PaymentReceiptData {
  orderNumber: string;
  referenceNo?: string | null;
  payerName?: string | null;
  paymentDate?: string | null;
  preparedBy?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
  paymentMethodLabel?: string | null;
  coverage?: string | null;
  taxBegYr?: string | null;
  amountPaid: number;
  basicTax?: number | null;
  penalty?: number | null;
  perRecordFees?: number | null;
  otherFees?: number | null;
  rates?: { taxRatePct?: number; penaltyRatePct?: number; feePerRecord?: number } | null;
  properties: ReceiptProperty[];
}

const formatMoney = (value: any) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(value || 0));

const formatLocalDateTime = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

/**
 * A single payment receipt. The on-screen variant (isPrint=false) keeps the
 * colored header band and emerald accents; the paper variant (isPrint=true)
 * renders a compact black-on-white document so two copies fit one A4 sheet.
 */
export const PaymentReceipt: React.FC<{ data: PaymentReceiptData; isPrint?: boolean; copyLabel?: string }> = ({
  data,
  isPrint = false,
  copyLabel,
}) => {
  const col3 = isPrint ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3';
  const col2 = isPrint ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2';
  const span2 = isPrint ? 'col-span-2' : 'sm:col-span-2';

  const totalAssessed = (data.properties || []).reduce((sum, r) => sum + Number(r.assValue || 0), 0);
  const hasBreakdown =
    data.basicTax != null || data.penalty != null || data.perRecordFees != null || data.otherFees != null;

  const s = {
    card: isPrint
      ? 'bg-white text-slate-900'
      : 'bg-white text-slate-900 rounded-xl border border-slate-200 overflow-hidden shadow-sm',
    header: isPrint
      ? 'px-4 pb-1.5 mb-0.5 border-b border-slate-300 text-slate-900'
      : 'bg-primary text-white px-6 py-5',
    headerRow: isPrint ? 'flex items-center justify-between gap-4' : 'flex items-start justify-between gap-6',
    headerMuted: isPrint ? 'text-slate-600' : 'text-white/80',
    seal: isPrint
      ? 'h-12 w-12 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0'
      : 'h-14 w-14 rounded-full overflow-hidden ring-2 ring-white/70 bg-white flex items-center justify-center shrink-0',
    brand: isPrint ? 'text-xs font-bold' : 'text-base font-bold',
    paidBadge: isPrint
      ? 'mt-1 inline-flex items-center gap-1 rounded-full border border-slate-800 px-2 py-0 text-[9px] font-bold uppercase tracking-wide text-slate-900'
      : 'mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 ring-1 ring-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-50',
    paidDot: isPrint ? 'bg-slate-800' : 'bg-emerald-300',
    detailCard: isPrint ? 'rounded-md border border-slate-300 p-2' : 'rounded-lg border border-slate-200 bg-slate-50/60 p-4',
    detailGapY: isPrint ? 'gap-y-1' : 'gap-y-3',
    amountCard: isPrint ? 'rounded-md border border-slate-300 p-2 flex flex-col' : 'rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex flex-col',
    amountLabel: isPrint ? 'text-slate-500' : 'text-emerald-700',
    amountValue: isPrint ? 'text-slate-900' : 'text-emerald-700',
    amountSize: isPrint ? 'text-lg' : 'text-2xl',
    amountSubLabel: isPrint ? 'text-slate-500' : 'text-emerald-700/80',
    amountSubVal: isPrint ? 'text-slate-900' : 'text-emerald-900',
    box: isPrint ? 'rounded-md border border-slate-300 p-2' : 'rounded-lg border border-slate-200 p-4',
    rowSpace: isPrint ? 'mt-1 space-y-0.5 text-[11px]' : 'mt-2 space-y-1.5 text-xs',
    tableWrap: isPrint ? 'mt-2 rounded-md border border-slate-300 overflow-hidden' : 'mt-4 rounded-lg border border-slate-200 overflow-hidden',
    tableHead: isPrint ? 'px-3 py-1 flex items-center justify-between border-b border-slate-300' : 'bg-slate-100 px-4 py-2.5 flex items-center justify-between',
    thead: isPrint ? 'text-[9px] uppercase tracking-wide text-slate-600 border-b border-slate-300' : 'bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200',
    rowBorder: isPrint ? 'border-b border-slate-200' : 'border-b border-slate-100 even:bg-slate-50/50',
    tfoot: isPrint ? 'border-t-2 border-slate-400 font-semibold text-slate-900' : 'bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-800',
    totalPaid: isPrint ? 'font-black text-slate-900' : 'font-black text-emerald-700',
    footerDivider: isPrint ? 'border-slate-300' : 'border-slate-200',
    body: isPrint ? 'relative px-4 py-2' : 'relative px-6 py-5',
    sectionGrid: isPrint ? 'gap-2' : 'gap-3',
    sigGap: isPrint ? 'mt-3' : 'mt-8',
    sigColGap: isPrint ? 'gap-6' : 'gap-8',
    blockGap: isPrint ? 'mt-2' : 'mt-4',
    footGap: isPrint ? 'mt-2 pt-1.5' : 'mt-5 pt-3',
  };

  const field = (label: string, value: React.ReactNode, mono = false) => (
    <div>
      <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">{label}</div>
      <div className={`text-xs text-slate-900 ${mono ? 'font-mono' : 'font-medium'}`}>{value || '-'}</div>
    </div>
  );

  const sumRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );

  const referenceNo = data.referenceNo || data.orderNumber;

  return (
    <div className={s.card}>
      {/* Header band */}
      <div className={s.header}>
        <div className={s.headerRow}>
          <div className="flex items-center gap-3">
            <div className={s.seal}>
              <img
                src="/assessor-logo.png"
                alt="Office of the Provincial Assessor"
                className="h-full w-full object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent && !parent.dataset.fallback) {
                    parent.dataset.fallback = '1';
                    parent.textContent = 'LGU';
                    parent.classList.add('text-[10px]', 'font-bold', isPrint ? 'text-slate-900' : 'text-slate-700');
                  }
                }}
              />
            </div>
            <div className="leading-tight">
              <div className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${s.headerMuted}`}>Republic of the Philippines</div>
              <div className={s.brand}>RPTAS Treasury</div>
              <div className={`text-[11px] ${s.headerMuted}`}>Official Payment Receipt</div>
            </div>
          </div>
          <div className="text-right">
            {copyLabel ? (
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-500">{copyLabel}</div>
            ) : null}
            <div className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${s.headerMuted}`}>Official Receipt No</div>
            <div className="font-mono text-lg font-bold tracking-wide">{data.orderNumber || '-'}</div>
            <div className={s.paidBadge}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.paidDot}`} /> Paid
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={s.body}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="text-[72px] font-black tracking-[0.25em] text-slate-900/[0.04] -rotate-12">OFFICIAL</div>
        </div>

        <div className="relative">
          {/* Party details + amount hero */}
          <div className={`grid ${col3} ${s.sectionGrid}`}>
            <div className={`${span2} ${s.detailCard}`}>
              <div className={`grid grid-cols-2 gap-x-4 ${s.detailGapY}`}>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Received From</div>
                  <div className="text-base font-bold text-slate-900">{data.payerName || '-'}</div>
                </div>
                {field('Reference No', referenceNo, true)}
                {field('Payment Date', data.paymentDate || '-')}
                {field('Prepared By', data.preparedBy || '-')}
                {field('Coverage', data.coverage || '-')}
                {field('Tax Beg Yr', data.taxBegYr || '-', true)}
              </div>
            </div>

            <div className={s.amountCard}>
              <div className={`text-[10px] uppercase font-bold tracking-wide ${s.amountLabel}`}>Amount Paid</div>
              <div className={`mt-1 ${s.amountSize} font-black leading-none ${s.amountValue}`}>{formatMoney(data.amountPaid)}</div>
              <div className={`mt-3 text-[10px] uppercase font-bold tracking-wide ${s.amountSubLabel}`}>Payment Method</div>
              <div className={`text-xs font-semibold ${s.amountSubVal}`}>{data.paymentMethodLabel || '-'}</div>
              <div className={`mt-auto pt-3 text-[10px] ${s.amountSubLabel}`}>Approved {formatLocalDateTime(data.approvedAt)}</div>
            </div>
          </div>

          {/* Properties table */}
          <div className={s.tableWrap}>
            <div className={s.tableHead}>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Included Properties ({data.properties.length})</span>
              {data.rates ? (
                <span className="text-[10px] font-medium text-slate-500">
                  Tax {Number(data.rates.taxRatePct || 0)}% • Penalty {Number(data.rates.penaltyRatePct || 0)}% • Fee/Record {formatMoney(data.rates.feePerRecord || 0)}
                </span>
              ) : null}
            </div>
            <div>
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className={s.thead}>
                    <th className="px-3 py-2 text-left w-[28px]">#</th>
                    <th className="px-3 py-2 text-left">TDN</th>
                    <th className="px-3 py-2 text-left">PIN</th>
                    <th className="px-3 py-2 text-left">Owner</th>
                    <th className="px-3 py-2 text-left">Location</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">Tax Beg Yr</th>
                    <th className="px-3 py-2 text-right">Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.properties.map((r, idx) => (
                    <tr key={`${r.tdn || r.pin || idx}`} className={s.rowBorder}>
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{r.tdn || '-'}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-600">{r.pin || '-'}</td>
                      <td className="px-3 py-2 font-medium">{r.ownerName || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{[r.municipality, r.barangay].filter(Boolean).join(' / ') || '-'}</td>
                      <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{r.taxBegYr || '-'}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatMoney(r.assValue || 0)}</td>
                    </tr>
                  ))}
                  {data.properties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                        No property records found for this receipt.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                {data.properties.length > 0 ? (
                  <tfoot>
                    <tr className={s.tfoot}>
                      <td colSpan={6} className="px-3 py-2 text-right text-[10px] uppercase tracking-wide">Total Assessed Value</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatMoney(totalAssessed)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>

          {/* Approval + breakdown */}
          <div className={`${s.blockGap} grid ${col2} ${s.sectionGrid}`}>
            <div className={s.box}>
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Approval</div>
              <div className={s.rowSpace}>
                {sumRow('Approved At', formatLocalDateTime(data.approvedAt))}
                {sumRow('Approved By', data.approvedByName || '-')}
                {sumRow('Payment Method', data.paymentMethodLabel || '-')}
              </div>
            </div>

            <div className={s.box}>
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Amount Breakdown</div>
              <div className={s.rowSpace}>
                {hasBreakdown ? (
                  <>
                    {sumRow('Basic Tax', data.basicTax != null ? formatMoney(data.basicTax) : '-')}
                    {sumRow('Penalty', data.penalty != null ? formatMoney(data.penalty) : '-')}
                    {sumRow('Per-record Fees', data.perRecordFees != null ? formatMoney(data.perRecordFees) : '-')}
                    {sumRow('Other Fees', data.otherFees != null ? formatMoney(data.otherFees) : '-')}
                  </>
                ) : null}
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Total Paid</span>
                  <span className={s.totalPaid}>{formatMoney(data.amountPaid)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className={`${s.sigGap} grid ${col2} ${s.sigColGap} text-xs`}>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-900">Treasury Officer</div>
              <div className="text-[10px] text-slate-500">Signature over printed name</div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-900">Client / Payor</div>
              <div className="text-[10px] text-slate-500">Signature over printed name</div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${s.footGap} border-t border-dashed ${s.footerDivider} text-[10px] text-slate-500 flex items-center justify-between`}>
            <span>This is a system-generated receipt. No signature required unless requested.</span>
            <span className="font-mono">Ref: {referenceNo}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hidden printable sheet: one A4 page per order, each page holding a Client's
 * copy (top) and an Assessor's copy (bottom) separated by a cut line.
 * Forward the ref to react-to-print's contentRef.
 */
export const PaymentReceiptPrintSheet = forwardRef<HTMLDivElement, { receipts: PaymentReceiptData[] }>(
  ({ receipts }, ref) => {
    return (
      <div className="print-document" aria-hidden="true">
        <div id="print-document" ref={ref} className="bg-white text-slate-900">
          {receipts.map((data, i) => (
            <div
              key={`${data.orderNumber}-${i}`}
              style={i < receipts.length - 1 ? { breakAfter: 'page' } : undefined}
            >
              <div className="receipt-copy px-3 pt-2">
                <PaymentReceipt data={data} isPrint copyLabel="Client's Copy" />
              </div>
              <div className="my-1.5 px-3">
                <div className="border-t border-dashed border-slate-400" />
                <div className="-mt-1.5 flex justify-center">
                  <span className="bg-white px-2 text-[8px] uppercase tracking-[0.3em] text-slate-400">✂ Cut here — Assessor's Copy below</span>
                </div>
              </div>
              <div className="receipt-copy px-3 pb-2">
                <PaymentReceipt data={data} isPrint copyLabel="Assessor's Copy" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
PaymentReceiptPrintSheet.displayName = 'PaymentReceiptPrintSheet';

export const RECEIPT_PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 0.5in; }
  @media print {
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* Shrink slightly so BOTH copies (Client + Assessor) fit on one page even
       with the 0.5in margin. zoom affects layout/pagination in Chrome. */
    #print-document { zoom: 0.9; }
    #print-document, #print-document * { font-weight: 400 !important; }
    #print-document td, #print-document th { padding-top: 1px !important; padding-bottom: 1px !important; }
    #print-document .receipt-copy { break-inside: avoid; }
  }
`;
