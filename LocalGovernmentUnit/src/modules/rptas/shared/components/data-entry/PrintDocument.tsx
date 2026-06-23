import React from 'react';
import { AssessmentRow } from '@/modules/rptas/shared/types/dataEntryTypes';

interface PropertyInfo {
  ownerName: string;
  pin: string;
  tdNo: string;
  arpNo: string;
  municipality: string;
  barangay: string;
  province: string;
  effectivityDate: string;
  declarationDate: string;
}

export interface PrintSignatureBlock {
  label: string;        // e.g. "Recommending Approval"
  name?: string | null; // person's name; blank line when null/empty
  sub?: string | null;  // title, e.g. "Municipal Assessor"
  date?: string | null; // signed/approved date
}

interface PrintDocumentProps {
  propertyInfo: PropertyInfo;
  assessmentRows: AssessmentRow[];
  summary: {
    totalArea: number;
    totalAdjustedMarketValue: number;
    totalAssessedValue: number;
  };
  /** Override the default signature blocks (used by the approval print to show
   *  the Municipal + Provincial Assessor blocks with names from the record). */
  signatures?: PrintSignatureBlock[];
}

const PrintDocument: React.FC<PrintDocumentProps> = ({
  propertyInfo,
  assessmentRows,
  summary,
  signatures,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getCurrentDateTime = () => {
    return new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateReferenceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RPTAX-${year}-${random}`;
  };

  return (
    <div id="print-document" className="print-document">
      {/* Watermark */}
      <div className="print-watermark">OFFICIAL COPY</div>

      {/* Header Section */}
      <div className="print-header">
        <div className="print-header-content">
          <div className="print-logo-box">
            <span className="print-logo-text">RP</span>
          </div>
          <div className="print-title-section">
            <p className="print-main-title">REPUBLIC OF THE PHILIPPINES</p>
            <p className="print-province">PROVINCE OF {(propertyInfo.province || 'Agusan del Norte').toUpperCase()}</p>
            <p className="print-municipality">MUNICIPALITY OF {(propertyInfo.municipality || 'Tubay').toUpperCase()}</p>
            <p className="print-office">Office of the Municipal Assessor</p>
          </div>
        </div>
        <div className="print-divider"></div>
        <h1 className="print-document-title">REAL PROPERTY TAX DECLARATION</h1>
        <p className="print-document-subtitle">FAAS / TDN Record</p>
      </div>

      {/* Reference Information */}
      <div className="print-reference">
        <div className="print-ref-item">
          <strong>Document Reference:</strong> {generateReferenceNumber()}
        </div>
        <div className="print-ref-item">
          <strong>Date Generated:</strong> {getCurrentDateTime()}
        </div>
      </div>

      {/* Property Information Section */}
      <div className="print-section">
        <h3 className="print-section-title">PROPERTY INFORMATION</h3>
        <div className="print-info-grid">
          <div className="print-info-item">
            <span className="print-label">Owner Name:</span>
            <span className="print-value">{propertyInfo.ownerName || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Property Index Number:</span>
            <span className="print-value">{propertyInfo.pin || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Tax Declaration No.:</span>
            <span className="print-value">{propertyInfo.tdNo || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">ARP No.:</span>
            <span className="print-value">{propertyInfo.arpNo || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Municipality:</span>
            <span className="print-value">{propertyInfo.municipality || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Barangay:</span>
            <span className="print-value">{propertyInfo.barangay || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Effectivity Date:</span>
            <span className="print-value">{formatDate(propertyInfo.effectivityDate)}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Declaration Date:</span>
            <span className="print-value">{formatDate(propertyInfo.declarationDate)}</span>
          </div>
        </div>
      </div>

      {/* Assessment Table Section */}
      <div className="print-section">
        <h3 className="print-section-title">ASSESSMENT DETAILS</h3>
        <table className="print-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Class</th>
              <th>Actual Use</th>
              <th>Sub Class</th>
              <th className="print-number">Area (sqm)</th>
              <th className="print-number">Unit Value</th>
              <th className="print-number">Base Market Value</th>
              <th className="print-number">Adjusted Market Value</th>
              <th className="print-number">Assessment Level (%)</th>
              <th className="print-number">Assessed Value</th>
            </tr>
          </thead>
          <tbody>
            {assessmentRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="print-no-data">
                  No assessment data available
                </td>
              </tr>
            ) : (
              assessmentRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.kind || '-'}</td>
                  <td>{row.class || '-'}</td>
                  <td>{row.actualUse || '-'}</td>
                  <td>{row.subClass || '-'}</td>
                  <td className="print-number">{row.area ? formatNumber(parseFloat(row.area)) : '-'}</td>
                  <td className="print-number">
                    {row.unitValue ? formatCurrency(parseFloat(row.unitValue)) : '-'}
                  </td>
                  <td className="print-number">
                    {row.baseMarketValue ? formatCurrency(parseFloat(row.baseMarketValue)) : '-'}
                  </td>
                  <td className="print-number">
                    {row.adjustedMarketValue ? formatCurrency(parseFloat(row.adjustedMarketValue)) : '-'}
                  </td>
                  <td className="print-number">{row.assessmentLevel || '-'}</td>
                  <td className="print-number">
                    {row.assessedValue ? formatCurrency(parseFloat(row.assessedValue)) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assessment Summary Section */}
      <div className="print-section">
        <h3 className="print-section-title">ASSESSMENT SUMMARY</h3>
        <table className="print-summary-table">
          <tbody>
            <tr>
              <td className="print-summary-label">Total Area (sqm):</td>
              <td className="print-summary-value">{formatNumber(summary.totalArea)}</td>
            </tr>
            <tr>
              <td className="print-summary-label">Total Adjusted Market Value:</td>
              <td className="print-summary-value">{formatCurrency(summary.totalAdjustedMarketValue)}</td>
            </tr>
            <tr className="print-summary-total">
              <td className="print-summary-label">TOTAL ASSESSED VALUE:</td>
              <td className="print-summary-value">{formatCurrency(summary.totalAssessedValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
      <div className="print-footer">
        <div className="print-signatures">
          {(signatures && signatures.length > 0
            ? signatures
            : [
                { label: 'Prepared by', sub: 'Assessment Clerk' },
                { label: 'Reviewed by', sub: 'Assessment Officer' },
                { label: 'Approved by', sub: 'Municipal Assessor' },
              ]
          ).map((sig, i) => (
            <div key={`${sig.label}-${i}`} className="print-signature-block">
              {/* Person's name sits above the line; blank line preserved when unsigned */}
              <div className="print-signature-name" style={{ fontWeight: 700, minHeight: '14px' }}>
                {sig.name || ' '}
              </div>
              <div className="print-signature-line"></div>
              <div className="print-signature-label">{sig.label}</div>
              {sig.sub ? <div className="print-signature-name">{sig.sub}</div> : null}
              {sig.date ? (
                <div className="print-signature-name" style={{ fontSize: '9px' }}>{formatDate(sig.date)}</div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="print-footer-note">
          <p>This is a computer-generated document. No signature is required.</p>
          <p className="print-page-number">Page 1 of 1</p>
        </div>
      </div>
    </div>
  );
};

export default PrintDocument;
