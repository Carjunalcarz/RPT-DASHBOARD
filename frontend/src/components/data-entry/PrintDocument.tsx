import React from 'react';
import { AssessmentRow } from './types';

interface PropertyInfo {
  ownerName: string;
  pin: string;
  tdNo: string;
  arpNo: string;
  municipality: string;
  barangay: string;
  effectivityDate: string;
  declarationDate: string;
}

interface PrintDocumentProps {
  propertyInfo: PropertyInfo;
  assessmentRows: AssessmentRow[];
  summary: {
    totalArea: number;
    totalAdjustedMarketValue: number;
    totalAssessedValue: number;
  };
}

const PrintDocument: React.FC<PrintDocumentProps> = ({
  propertyInfo,
  assessmentRows,
  summary,
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
          <div className="print-logo">
            <div className="print-logo-box">
              <span className="print-logo-text">RP</span>
            </div>
          </div>
          <div className="print-title-section">
            <h1 className="print-main-title">REPUBLIC OF THE PHILIPPINES</h1>
            <h2 className="print-province">PROVINCE OF AGUSAN DEL NORTE</h2>
            <h2 className="print-municipality">MUNICIPALITY OF TUBAY</h2>
            <h3 className="print-office">Office of the Municipal Assessor</h3>
          </div>
        </div>
        <div className="print-divider"></div>
        <h2 className="print-document-title">REAL PROPERTY TAX DECLARATION</h2>
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
            <span className="print-value">{propertyInfo.effectivityDate || 'N/A'}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Declaration Date:</span>
            <span className="print-value">{propertyInfo.declarationDate || 'N/A'}</span>
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
          <div className="print-signature-block">
            <div className="print-signature-line"></div>
            <div className="print-signature-label">Prepared by</div>
            <div className="print-signature-name">Assessment Clerk</div>
          </div>
          <div className="print-signature-block">
            <div className="print-signature-line"></div>
            <div className="print-signature-label">Reviewed by</div>
            <div className="print-signature-name">Assessment Officer</div>
          </div>
          <div className="print-signature-block">
            <div className="print-signature-line"></div>
            <div className="print-signature-label">Approved by</div>
            <div className="print-signature-name">Municipal Assessor</div>
          </div>
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
