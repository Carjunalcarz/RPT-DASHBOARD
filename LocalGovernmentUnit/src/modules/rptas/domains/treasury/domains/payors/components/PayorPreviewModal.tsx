import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/modules/rptas/ui/dialog';
import { Button } from '@/modules/rptas/ui/button';
import { IdCard, Loader2, Check } from 'lucide-react';
import payorService from '@/services/payorService';
import type { Payor } from '@/types/payor';

interface PayorPreviewModalProps {
  payor: Payor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payor: Payor) => void;
}

const Field: React.FC<{ label: string; value?: string; mono?: boolean }> = ({ label, value, mono }) =>
  value ? (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  ) : null;

/** Preview a payor (details + ID image) before using them on an Order of Payment. */
const PayorPreviewModal: React.FC<PayorPreviewModalProps> = ({ payor, open, onOpenChange, onConfirm }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let active = true;
    setImgUrl(null);
    setImgError(false);
    const path = payor?.contact?.idImagePath;
    const url = payor?.contact?.idImageUrl;
    if (open && path) {
      setImgLoading(true);
      payorService
        .getIdImageSignedUrl(path)
        .then((r) => {
          if (!active) return;
          if (r.url) setImgUrl(r.url);
          else if (url) setImgUrl(url);
          else setImgError(true);
        })
        .catch(() => {
          if (!active) return;
          if (url) setImgUrl(url);
          else setImgError(true);
        })
        .finally(() => {
          if (active) setImgLoading(false);
        });
    } else if (open && url) {
      setImgUrl(url);
    }
    return () => {
      active = false;
    };
  }, [open, payor]);

  if (!payor) return null;
  const fullName = `${payor.firstName} ${payor.lastName}`.trim();
  const c = payor.contact || ({} as Payor['contact']);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payor Preview</DialogTitle>
          <DialogDescription>Confirm this is the correct payor before using them on the Order of Payment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm aspect-[1.585] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              {imgLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : imgUrl && !imgError ? (
                <img
                  src={imgUrl}
                  alt={fullName}
                  className="h-full w-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <IdCard className="h-7 w-7" />
                  <span className="text-[11px]">No ID image on file</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-lg font-semibold text-slate-900 dark:text-slate-100">{fullName}</div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ID Type" value={payor.idType} />
            <Field label="ID Number" value={payor.idNumber} mono />
            <div className="col-span-2">
              <Field label="Address" value={payor.address} />
            </div>
            <Field label="Birth Date" value={c.birthDate} />
            <Field label="Gender" value={c.gender} />
            <Field label="Phone" value={c.phone} />
            <Field label="Email" value={c.email} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConfirm(payor);
                onOpenChange(false);
              }}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" /> Use this Payor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayorPreviewModal;
