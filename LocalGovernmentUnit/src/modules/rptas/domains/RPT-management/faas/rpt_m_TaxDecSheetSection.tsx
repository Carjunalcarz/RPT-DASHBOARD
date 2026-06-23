import React, { useState } from 'react';
import { Printer, FileText } from 'lucide-react';

const TaxDecSheetSection: React.FC = () => {
  const [printingType, setPrintingType] = useState<'individual' | 'batch'>('individual');
  const [options, setOptions] = useState({
    withCertifiedTrueCopy: false,
    withCertifiedTrueCopyCTCDateEnabled: false,
    withCertifiedTrueCopyCTCDate: '02/20/2026',
    withCertificationQRFromTOIMS: false,
    forApprovalNoPrintedTDN: false,
    withSGDPrefixInSignatory: false,
    singlePageFormat: true,
    oldFormat: false,
    prePrintedForm: false,
    printMachineAttachment: false,
  });

  const handlePrint = () => {
    console.log('Printing with options:', options);
    // Print logic here
  };

  const handleCancel = () => {
    console.log('Print cancelled');
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{
          background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-light))',
        }}
      >
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-surface" />
          <h2 className="text-base font-semibold text-surface">TAX DECLARATION PRINT OPTION</h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Printing Type */}
        <div className="mb-6">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="printingType"
                value="individual"
                checked={printingType === 'individual'}
                onChange={(e) => setPrintingType(e.target.value as 'individual')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground dark:text-foreground italic">Individual Printing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="printingType"
                value="batch"
                checked={printingType === 'batch'}
                onChange={(e) => setPrintingType(e.target.value as 'batch')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground dark:text-foreground italic">Batch Printing</span>
            </label>
          </div>
        </div>

        {/* Options */}
        <div className="border border-border dark:border-border rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground dark:text-foreground mb-3">Options</h3>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.withCertifiedTrueCopy}
                onChange={(e) => setOptions({ ...options, withCertifiedTrueCopy: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">With certified true copy notation</span>
            </label>

            <div className="flex items-center gap-2 ml-6">
              <label className="flex items-start gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={options.withCertifiedTrueCopyCTCDateEnabled}
                  onChange={(e) => setOptions({ ...options, withCertifiedTrueCopyCTCDateEnabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                />
                <span className="text-sm text-foreground dark:text-foreground italic">With certified true copy (CTC) date</span>
              </label>
              <input
                type="text"
                value={options.withCertifiedTrueCopyCTCDate}
                onChange={(e) => setOptions({ ...options, withCertifiedTrueCopyCTCDate: e.target.value })}
                disabled={!options.withCertifiedTrueCopyCTCDateEnabled}
                className="px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                placeholder="MM/DD/YYYY"
              />
            </div>

            <div className="flex items-center gap-2 ml-6">
              <label className="flex items-start gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={options.withCertificationQRFromTOIMS}
                  onChange={(e) => setOptions({ ...options, withCertificationQRFromTOIMS: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                />
                <span className="text-sm text-foreground dark:text-foreground italic">With Certification QR from TOIMS</span>
              </label>
              <select className="px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary">
                <option value=""></option>
              </select>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.forApprovalNoPrintedTDN}
                onChange={(e) => setOptions({ ...options, forApprovalNoPrintedTDN: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">For approval (no printed TDN)</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.withSGDPrefixInSignatory}
                onChange={(e) => setOptions({ ...options, withSGDPrefixInSignatory: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">With "SGD" prefix in signatory</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.singlePageFormat}
                onChange={(e) => setOptions({ ...options, singlePageFormat: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">Single Page Format</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.oldFormat}
                onChange={(e) => setOptions({ ...options, oldFormat: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">Old Format</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.prePrintedForm}
                onChange={(e) => setOptions({ ...options, prePrintedForm: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">Pre-printed Form</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.printMachineAttachment}
                onChange={(e) => setOptions({ ...options, printMachineAttachment: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-foreground dark:text-foreground italic">Print Machine Attachment</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2 text-sm bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-2"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-sm bg-muted/20 hover:bg-slate-300 dark:bg-muted/20 dark:hover:bg-muted/30 text-foreground dark:text-foreground rounded shadow-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxDecSheetSection;
