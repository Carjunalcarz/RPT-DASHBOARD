import React, { useState } from 'react';
import { Printer, FileText } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';

const TaxDecSheetSection: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">TAX DECLARATION PRINT OPTION</h2>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">Individual Printing</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">Batch Printing</span>
            </label>
          </div>
        </div>

        {/* Options */}
        <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Options</h3>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.withCertifiedTrueCopy}
                onChange={(e) => setOptions({ ...options, withCertifiedTrueCopy: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">With certified true copy notation</span>
            </label>

            <div className="flex items-center gap-2 ml-6">
              <label className="flex items-start gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={options.withCertifiedTrueCopyCTCDateEnabled}
                  onChange={(e) => setOptions({ ...options, withCertifiedTrueCopyCTCDateEnabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 italic">With certified true copy (CTC) date</span>
              </label>
              <input
                type="text"
                value={options.withCertifiedTrueCopyCTCDate}
                onChange={(e) => setOptions({ ...options, withCertifiedTrueCopyCTCDate: e.target.value })}
                disabled={!options.withCertifiedTrueCopyCTCDateEnabled}
                className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
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
                <span className="text-sm text-slate-700 dark:text-slate-300 italic">With Certification QR from TOIMS</span>
              </label>
              <select className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-primary/50">
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
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">For approval (no printed TDN)</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.withSGDPrefixInSignatory}
                onChange={(e) => setOptions({ ...options, withSGDPrefixInSignatory: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">With "SGD" prefix in signatory</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.singlePageFormat}
                onChange={(e) => setOptions({ ...options, singlePageFormat: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">Single Page Format</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.oldFormat}
                onChange={(e) => setOptions({ ...options, oldFormat: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">Old Format</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.prePrintedForm}
                onChange={(e) => setOptions({ ...options, prePrintedForm: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">Pre-printed Form</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.printMachineAttachment}
                onChange={(e) => setOptions({ ...options, printMachineAttachment: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 italic">Print Machine Attachment</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2 text-sm bg-primary hover:bg-primary-light text-white dark:text-white rounded shadow-sm transition-colors flex items-center gap-2"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded shadow-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxDecSheetSection;
