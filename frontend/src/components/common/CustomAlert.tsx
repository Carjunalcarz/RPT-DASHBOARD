import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAlert } from '@/context/AlertContext';

const CustomAlert: React.FC = () => {
  const { isOpen, closeAlert, alertType, alertOptions, confirmOptions } = useAlert();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAlert(false);
    }
  };

  const isConfirm = alertType === 'confirm';
  const options = isConfirm ? confirmOptions : alertOptions;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="custom-alert-dialog">
        <DialogHeader>
          <DialogTitle>{options.title || (isConfirm ? 'Confirm' : 'Alert')}</DialogTitle>
          <DialogDescription>
            {options.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {isConfirm ? (
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => closeAlert(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                data-testid="custom-alert-cancel-button"
              >
                {confirmOptions.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => closeAlert(true)}
                className={`inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  confirmOptions.variant === 'destructive' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                data-testid="custom-alert-confirm-button"
              >
                {confirmOptions.confirmLabel || 'Confirm'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => closeAlert()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              data-testid="custom-alert-ok-button"
            >
              {alertOptions.buttonLabel || 'OK'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomAlert;
