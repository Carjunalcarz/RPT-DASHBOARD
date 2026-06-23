const normalize = (value: string) => String(value || '').trim().toLowerCase();

export const getPaymentStatusColor = (status: string) => {
  const s = normalize(status);
  if (s === 'paid') return 'emerald';
  if (s === 'pending') return 'amber';
  if (s === 'unpaid') return 'slate';
  if (s === 'failed' || s === 'cancelled') return 'rose';
  return 'slate';
};

export const getPaymentBadgeClassName = (status: string) => {
  const s = normalize(status);
  if (s === 'paid') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800/40';
  }
  if (s === 'pending') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/40';
  }
  if (s === 'unpaid' || !s) {
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-200 dark:border-slate-800/40';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800/40';
};

export const getPaymentRowClassName = (status: string) => {
  const s = normalize(status);
  if (s === 'paid') return 'bg-emerald-50/60 dark:bg-emerald-900/10';
  if (s === 'pending') return 'bg-amber-50/60 dark:bg-amber-900/10';
  if (s === 'unpaid' || !s) return 'bg-slate-50/40 dark:bg-slate-900/10';
  return 'bg-rose-50/60 dark:bg-rose-900/10';
};

export const isPaymentSelectionDisabled = (status: string) => {
  const s = normalize(status);
  return s === 'paid' || s === 'pending';
};
