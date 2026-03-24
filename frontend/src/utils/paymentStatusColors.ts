export type PaymentStatusKey = 'completed' | 'pending' | 'failed' | 'cancelled' | 'unpaid' | 'unknown';

export type PaymentStatusColor = {
  rowClassName: string;
  badgeClassName: string;
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatusKey, PaymentStatusColor> = {
  completed: {
    rowClassName: 'bg-emerald-50/60 dark:bg-emerald-950/25',
    badgeClassName:
      'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900',
  },
  pending: {
    rowClassName: 'bg-amber-50/60 dark:bg-amber-950/25',
    badgeClassName:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 border-amber-200 dark:border-amber-900',
  },
  failed: {
    rowClassName: 'bg-red-50/60 dark:bg-red-950/25',
    badgeClassName: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200 border-red-200 dark:border-red-900',
  },
  cancelled: {
    rowClassName: 'bg-slate-100/70 dark:bg-slate-900/35',
    badgeClassName:
      'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
  unpaid: {
    rowClassName: 'bg-slate-50 dark:bg-slate-900/20',
    badgeClassName:
      'bg-slate-50 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
  unknown: {
    rowClassName: '',
    badgeClassName:
      'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

export const normalizePaymentStatus = (status?: string | null): PaymentStatusKey => {
  const s = String(status || '')
    .trim()
    .toLowerCase();

  if (!s) return 'unknown';
  if (s === 'paid' || s === 'completed' || s === 'success' || s === 'successful') return 'completed';
  if (s === 'pending' || s === 'in progress' || s === 'processing') return 'pending';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'cancelled' || s === 'canceled' || s === 'void') return 'cancelled';
  if (s === 'unpaid') return 'unpaid';
  return 'unknown';
};

export const getPaymentRowClassName = (status?: string | null) => {
  const key = normalizePaymentStatus(status);
  return PAYMENT_STATUS_COLORS[key].rowClassName;
};

export const getPaymentBadgeClassName = (status?: string | null) => {
  const key = normalizePaymentStatus(status);
  return PAYMENT_STATUS_COLORS[key].badgeClassName;
};

export const isPaymentSelectionDisabled = (status?: string | null) => {
  const key = normalizePaymentStatus(status);
  return key === 'completed' || key === 'pending';
};

