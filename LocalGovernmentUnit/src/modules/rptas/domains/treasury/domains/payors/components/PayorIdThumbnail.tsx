import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/modules/rptas/ui/dialog';
import { IdCard, ImageOff, Loader2 } from 'lucide-react';
import payorService from '@/services/payorService';

interface PayorIdThumbnailProps {
  /** Storage path (preferred — resolved to a signed URL for private buckets). */
  path?: string;
  /** Public URL fallback (used when no path, or signing fails). */
  url?: string;
  alt?: string;
}

/**
 * Shows a small thumbnail of a payor's stored ID image. Resolves a short-lived
 * signed URL from the backend (so it works with private buckets) and opens the
 * full image in a dialog on click.
 */
const PayorIdThumbnail: React.FC<PayorIdThumbnailProps> = ({ path, url, alt }) => {
  const [resolved, setResolved] = useState<string | null>(url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (path) {
      setLoading(true);
      payorService
        .getIdImageSignedUrl(path)
        .then((r) => {
          if (!active) return;
          if (r.url) setResolved(r.url);
          else if (url) setResolved(url);
          else setError(true);
        })
        .catch(() => {
          if (!active) return;
          if (url) setResolved(url);
          else setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (url) {
      setResolved(url);
    }
    return () => {
      active = false;
    };
  }, [path, url]);

  if (!path && !url) {
    return (
      <div
        className="h-12 w-16 flex-shrink-0 flex items-center justify-center rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-400"
        title="No ID image on file"
      >
        <IdCard className="h-5 w-5" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => resolved && setOpen(true)}
        disabled={!resolved}
        className="h-12 w-16 flex-shrink-0 flex items-center justify-center overflow-hidden rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:ring-2 hover:ring-primary/50 transition disabled:cursor-default"
        title="View ID image"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : error || !resolved ? (
          <ImageOff className="h-4 w-4 text-slate-400" />
        ) : (
          <img
            src={resolved}
            alt={alt || 'ID'}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-sm">{alt ? `ID — ${alt}` : 'ID Image'}</DialogTitle>
          {resolved ? <img src={resolved} alt={alt || 'ID'} className="w-full rounded-md" /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayorIdThumbnail;
