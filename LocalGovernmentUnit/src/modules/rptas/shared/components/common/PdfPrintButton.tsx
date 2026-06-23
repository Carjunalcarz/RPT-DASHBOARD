
import React, { useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PdfPrintButtonProps {
  contentRef?: React.RefObject<HTMLDivElement | null>; // Made optional to support PDF-only mode
  documentTitle?: string;
  pdfEndpoint?: string;
  pdfData?: any; // Data to send to backend
}

export const PdfPrintButton: React.FC<PdfPrintButtonProps> = ({
  contentRef,
  documentTitle = 'Document',
  pdfEndpoint,
  pdfData
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: contentRef as React.RefObject<HTMLDivElement | null>, // Updated for newer react-to-print versions
    documentTitle,
  });

  const handleDownloadPdf = async () => {
    if (!pdfEndpoint || !pdfData) return;

    setIsDownloading(true);
    const toastId = toast.loading('Generating PDF...');

    try {
        const response = await fetch(pdfEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pdfData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error: any) {
        console.error(error);
        toast.error(`Failed to download PDF: ${error.message}`, { id: toastId });
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {contentRef && (
        <button
            onClick={() => handlePrint && handlePrint()}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            title="Print current view"
        >
            <Printer size={14} />
            Print View
        </button>
      )}
      {pdfEndpoint && (
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-3 py-2 text-xs bg-primary hover:bg-primary-light text-white dark:text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Download official PDF from server"
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Official PDF
          </button>
      )}
    </div>
  );
};
