import { useCallback, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, HelpCircle } from "lucide-react";

/**
 * useConfirm — promise-based confirmation dialog.
 *
 *   const { confirm, dialog } = useConfirm();
 *
 *   const ok = await confirm({
 *     message: "Delete this role?",
 *     variant: "destructive",
 *   });
 *   if (ok) { ... }
 *
 *   // Render dialog somewhere inside the component:
 *   return <>{dialog}<rest/></>;
 *
 * Drop-in replacement for `window.confirm(...)`. Uses Radix Dialog so it
 * inherits the project's modal styling and accessibility (focus trap,
 * Escape to dismiss, overlay click to cancel).
 */

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

export interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  dialog: React.ReactNode;
}

export function useConfirm(): UseConfirmReturn {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((val: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      // If a previous confirm is somehow still open, resolve it false so we
      // don't leak hanging promises.
      resolverRef.current?.(false);
      setOpts(options);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [],
  );

  const handleClose = useCallback((val: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    resolver?.(val);
  }, []);

  const dialog = opts ? (
    <Dialog.Root open onOpenChange={(open) => !open && handleClose(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl z-50 outline-none"
          onEscapeKeyDown={() => handleClose(false)}
        >
          <div className="flex items-start gap-4 p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                opts.variant === "destructive"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-success/10 text-success"
              }`}
            >
              {opts.variant === "destructive" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <HelpCircle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {opts.title ||
                  (opts.variant === "destructive"
                    ? "Are you sure?"
                    : "Please confirm")}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-muted leading-relaxed">
                {opts.message}
              </Dialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-background/30 px-5 py-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background transition-colors"
            >
              {opts.cancelLabel || "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => handleClose(true)}
              autoFocus
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                opts.variant === "destructive"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-success hover:bg-success/90"
              }`}
            >
              {opts.confirmLabel ||
                (opts.variant === "destructive" ? "Delete" : "Confirm")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ) : null;

  return { confirm, dialog };
}

export default useConfirm;
