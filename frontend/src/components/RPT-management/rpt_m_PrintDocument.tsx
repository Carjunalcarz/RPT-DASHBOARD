import React from 'react';
import { AssessmentRow } from './rpt_m_types';

interface PropertyInfo {
  ownerName: string;
  ownerAddress: string;
  ownerTin: string;
  ownerTel: string;
  adminName: string;
  adminAddress: string;
  adminTin: string;
  adminTel: string;
  pin: string;
  tdNo: string;
  arpNo: string;
  transactionCode: string;
  octTctNo: string;
  octTctDate: string;
  cadLotNo: string;
  lotNo: string;
  cloaCscNo: string;
  cloaDate: string;
  surveyNo: string;
  blockNo: string;
  location: {
    street: string;
    barangay: string;
    municipality: string;
    province: string;
  };
  boundaries: {
    north: string;
    east: string;
    south: string;
    west: string;
  };
  backPart: {
    taxable: boolean;
    exempt: boolean;
    effQtr: string;
    effYear: string;
    memoranda: string;
    superseded: {
      pin: string;
      tdNo: string;
      landValue: number;
      impvtValue: number;
      totalValue: number;
      previousOwner: string;
      effectivity: string;
      arPageNo: string;
      recordingPersonnel: string;
    };
    signatories: {
      appraiser: string;
      appraiserDate: string;
      recommending: string;
      recommendingDate: string;
      approver: string;
      approverDate: string;
    };
  };
  effectivityDate: string;
  declarationDate: string;
}

interface ImprovementRow {
  id: string;
  kind: string;
  subClass: string;
  nonFruitBearing: string;
  fruitBearing: string;
  unitValue: string;
  baseMarketValue: string;
}

interface ValueAdjustmentRow {
  id: string;
  baseMarketValue: number;
  adjustmentFactor: string;
  percentAdjustment: string;
  valueAdjustment: number;
  marketValue: number;
}

interface PropertyAssessmentRow {
  id: string;
  actualUse: string;
  adjustedMarketValue: number;
  assessmentLevel: string;
  assessedValue: number;
}

interface PrintDocumentProps {
  propertyInfo: PropertyInfo;
  assessmentRows: AssessmentRow[];
  improvementRows?: ImprovementRow[];
  valueAdjustmentRows?: ValueAdjustmentRow[];
  propertyAssessmentRows?: PropertyAssessmentRow[];
  summary: {
    totalArea: number;
    totalAdjustedMarketValue: number;
    totalAssessedValue: number;
  };
}

const PrintDocument: React.FC<PrintDocumentProps> = ({
  propertyInfo,
  assessmentRows,
  improvementRows = [],
  valueAdjustmentRows = [],
  propertyAssessmentRows = [],
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

  const totalImprovementValue = improvementRows.reduce(
    (acc, curr) => acc + (parseFloat(curr.baseMarketValue) || 0),
    0
  );

  const truncateText = (text: string, limit: number) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  return (
    <div id="print-document" className="print-faas-official">
      {/* FRONT PAGE */}
      <div className="faas-page faas-page-front">
        <div className="faas-border-inner">
          {/* Form Header */}
          <div className="faas-header">
            <div className="faas-header-logo">
              {/* This would be an img tag in production */}
              <div className="faas-seal">RP</div>
            </div>
            <div className="faas-header-text">
              <div className="faas-country">REPUBLIC OF THE PHILIPPINES | FIELD APPRAISAL & ASSESSMENT REPORT</div>
              <div className="faas-report-title">LAND & OTHER IMPROVEMENTS</div>
            </div>
          </div>

          {/* Top Info Grid */}
          <div className="faas-row faas-top-info">
            <div className="faas-col faas-col-6 border-r border-b">
              <span className="faas-label">TD / ARP No.</span>
              <span className="faas-value">{propertyInfo.tdNo}</span>
            </div>
            <div className="faas-col faas-col-4 border-r border-b">
              <span className="faas-label">PIN:</span>
              <span className="faas-value">{propertyInfo.pin}</span>
            </div>
            <div className="faas-col faas-col-2 border-b text-center">
              <span className="faas-label">TRANSACTION CODE</span>
              <span className="faas-value font-bold">{propertyInfo.transactionCode}</span>
            </div>
          </div>

          <div className="faas-row border-b">
            <div className="faas-col faas-col-3 border-r">
              <span className="faas-label">OCT/TCT No.</span>
              <span className="faas-value">{propertyInfo.octTctNo}</span>
            </div>
            <div className="faas-col faas-col-2 border-r">
              <span className="faas-label">Dated:</span>
              <span className="faas-value">{formatDate(propertyInfo.octTctDate)}</span>
            </div>
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">Cadastral Lot No.</span>
              <span className="faas-value">{propertyInfo.cadLotNo}</span>
            </div>
            <div className="faas-col faas-col-3">
              <span className="faas-label">Lot No.</span>
              <span className="faas-value">{propertyInfo.lotNo}</span>
            </div>
          </div>

          <div className="faas-row border-b">
            <div className="faas-col faas-col-3 border-r">
              <span className="faas-label">CLOA / CSC No.</span>
              <span className="faas-value">{propertyInfo.cloaCscNo}</span>
            </div>
            <div className="faas-col faas-col-2 border-r">
              <span className="faas-label">Dated:</span>
              <span className="faas-value">{formatDate(propertyInfo.cloaDate)}</span>
            </div>
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">Survey No:</span>
              <span className="faas-value">{propertyInfo.surveyNo}</span>
            </div>
            <div className="faas-col faas-col-3">
              <span className="faas-label">Block No.</span>
              <span className="faas-value">{propertyInfo.blockNo}</span>
            </div>
          </div>

          {/* Owner Info Section */}
          <div className="faas-row border-b">
            <div className="faas-col faas-col-9 border-r">
              <div className="faas-row mb-1">
                <span className="faas-label w-16">Owner:</span>
                <span className="faas-value font-bold uppercase">{propertyInfo.ownerName}</span>
              </div>
              <div className="faas-row mb-1">
                <span className="faas-label w-16">Address:</span>
                <span className="faas-value text-xs">{propertyInfo.ownerAddress}</span>
              </div>
            </div>
            <div className="faas-col faas-col-3">
              <div className="faas-row mb-1">
                <span className="faas-label w-12">TIN:</span>
                <span className="faas-value">{propertyInfo.ownerTin}</span>
              </div>
              <div className="faas-row">
                <span className="faas-label w-12">Tel. No:</span>
                <span className="faas-value">{propertyInfo.ownerTel}</span>
              </div>
            </div>
          </div>

          {/* Admin Info Section */}
          <div className="faas-row border-b">
            <div className="faas-col faas-col-9 border-r">
              <div className="faas-row mb-1">
                <span className="faas-label w-48">Administrator/Beneficial User:</span>
                <span className="faas-value font-bold uppercase">{propertyInfo.adminName}</span>
              </div>
              <div className="faas-row mb-1">
                <span className="faas-label w-16">Address:</span>
                <span className="faas-value text-xs">{propertyInfo.adminAddress}</span>
              </div>
            </div>
            <div className="faas-col faas-col-3">
              <div className="faas-row mb-1">
                <span className="faas-label w-12">TIN:</span>
                <span className="faas-value">{propertyInfo.adminTin}</span>
              </div>
              <div className="faas-row">
                <span className="faas-label w-12">Tel. No:</span>
                <span className="faas-value">{propertyInfo.adminTel}</span>
              </div>
            </div>
          </div>

          {/* Property Location Section */}
          <div className="faas-section-header">PROPERTY LOCATION</div>
          <div className="faas-row border-b">
            <div className="faas-col faas-col-12">
              <span className="faas-label">No./Street/Purok/Sitio/Zone/Subd:</span>
              <span className="faas-value">{propertyInfo.location.street}</span>
            </div>
          </div>
          <div className="faas-row border-b">
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">Barangay:</span>
              <span className="faas-value uppercase">{propertyInfo.location.barangay}</span>
            </div>
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">Municipality:</span>
              <span className="faas-value uppercase">{propertyInfo.location.municipality}</span>
            </div>
            <div className="faas-col faas-col-4">
              <span className="faas-label">Province:</span>
              <span className="faas-value uppercase">{propertyInfo.location.province}</span>
            </div>
          </div>

          {/* Boundaries and Sketch Section */}
          <div className="faas-row border-b">
            <div className="faas-col faas-col-6 border-r flex flex-col">
              <div className="faas-section-header border-b-0">PROPERTY BOUNDARIES</div>
              <div className="faas-boundary-item">
                <span className="faas-label w-12">North:</span>
                <span className="faas-value">{propertyInfo.boundaries.north}</span>
              </div>
              <div className="faas-boundary-item">
                <span className="faas-label w-12">East:</span>
                <span className="faas-value">{propertyInfo.boundaries.east}</span>
              </div>
              <div className="faas-boundary-item">
                <span className="faas-label w-12">South:</span>
                <span className="faas-value">{propertyInfo.boundaries.south}</span>
              </div>
              <div className="faas-boundary-item border-b-0">
                <span className="faas-label w-12">West:</span>
                <span className="faas-value">{propertyInfo.boundaries.west}</span>
              </div>
            </div>
            <div className="faas-col faas-col-6 p-0 flex flex-col">
              <div className="faas-section-header border-b-0">Land Sketch:</div>
              <div className="faas-sketch-area flex-1 flex items-center justify-center relative p-4">
                {/* Compass Icon */}
                <div className="absolute top-2 right-2 flex flex-col items-center">
                   <div className="font-bold text-[8pt]">N</div>
                   <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-black"></div>
                </div>
                
                {/* Visual Sketch Box */}
                <div className="w-24 h-24 border-2 border-black relative">
                   {/* North */}
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[7pt] text-center w-40 leading-tight font-medium">
                      {truncateText(propertyInfo.boundaries.north, 30)}
                   </div>
                   {/* East */}
                   <div className="absolute top-1/2 -right-28 -translate-y-1/2 text-[7pt] text-left w-24 leading-tight font-medium">
                      {truncateText(propertyInfo.boundaries.east, 20)}
                   </div>
                   {/* South */}
                   <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[7pt] text-center w-40 leading-tight font-medium">
                      {truncateText(propertyInfo.boundaries.south, 30)}
                   </div>
                   {/* West */}
                   <div className="absolute top-1/2 -left-28 -translate-y-1/2 text-[7pt] text-right w-24 leading-tight font-medium">
                      {truncateText(propertyInfo.boundaries.west, 20)}
                   </div>
                </div>
                <div className="absolute bottom-1 right-2 text-[5pt] italic text-slate-500">(Not necessarily drawn to scale)</div>
              </div>
            </div>
          </div>

          {/* Land Appraisal Section */}
          <div className="faas-section-header">LAND APPRAISAL</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Sub-Classification</th>
                <th className="text-right">Area (ha./sqm.)</th>
                <th className="text-right">Unit Value</th>
                <th className="text-right">Base Market Value (Php)</th>
              </tr>
            </thead>
            <tbody>
              {assessmentRows.map(row => (
                <tr key={row.id}>
                  <td>{row.class}</td>
                  <td>{row.subClass}</td>
                  <td className="text-right">{row.area}</td>
                  <td className="text-right">{formatNumber(parseFloat(row.unitValue))}</td>
                  <td className="text-right">{formatNumber(parseFloat(row.baseMarketValue))}</td>
                </tr>
              ))}
              <tr className="faas-table-total">
                <td colSpan={2} className="text-right font-bold">Total</td>
                <td className="text-right font-bold">{summary.totalArea}</td>
                <td className="bg-slate-50"></td>
                <td className="text-right font-bold">{formatNumber(summary.totalAdjustedMarketValue)}</td>
              </tr>
            </tbody>
          </table>

          {/* Other Improvements Section */}
          <div className="faas-section-header">OTHER IMPROVEMENTS</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th rowSpan={2}>Kind</th>
                <th rowSpan={2}>Sub class</th>
                <th colSpan={2} className="text-center">Total Number</th>
                <th rowSpan={2} className="text-right">Unit Value</th>
                <th rowSpan={2} className="text-right">Base Market Value Php</th>
              </tr>
              <tr>
                <th className="text-center border-t border-slate-300">Non-Fruit Bearing / Non Harvestable (Age)</th>
                <th className="text-center border-t border-slate-300">Fruit Bearing / Harvestable (Age)</th>
              </tr>
            </thead>
            <tbody>
              {improvementRows.length === 0 ? (
                <tr><td colSpan={6} className="h-12"></td></tr>
              ) : (
                improvementRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.kind}</td>
                    <td>{row.subClass}</td>
                    <td className="text-center">{row.nonFruitBearing}</td>
                    <td className="text-center">{row.fruitBearing}</td>
                    <td className="text-right">{row.unitValue}</td>
                    <td className="text-right">{row.baseMarketValue}</td>
                  </tr>
                ))
              )}
              <tr className="faas-table-total">
                <td colSpan={5} className="text-right font-bold">Total</td>
                <td className="text-right font-bold">{formatNumber(totalImprovementValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="faas-page-break"></div>

      {/* BACK PAGE */}
      <div className="faas-page faas-page-back">
        <div className="faas-border-inner">
          {/* Value Adjustment Section */}
          <div className="faas-section-header">VALUE ADJUSTMENTS</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Base Market Value (Php)</th>
                <th>Adjustment Factor</th>
                <th>% Adjustment</th>
                <th className="text-right">Value Adjustment (Php)</th>
                <th className="text-right">Market Value (Php)</th>
              </tr>
            </thead>
            <tbody>
              {valueAdjustmentRows.length === 0 ? (
                <tr><td colSpan={5} className="h-12"></td></tr>
              ) : (
                valueAdjustmentRows.map(row => (
                  <tr key={row.id}>
                    <td>{formatNumber(row.baseMarketValue)}</td>
                    <td>{row.adjustmentFactor}</td>
                    <td>{row.percentAdjustment}</td>
                    <td className="text-right">{formatNumber(row.valueAdjustment)}</td>
                    <td className="text-right">{formatNumber(row.marketValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Property Assessment Section */}
          <div className="faas-section-header">PROPERTY ASSESSMENT</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Actual Use</th>
                <th className="text-right">Adjusted Market Value (Php)</th>
                <th>Assessment Level (%)</th>
                <th className="text-right">Assessed Value (Php)</th>
              </tr>
            </thead>
            <tbody>
              {propertyAssessmentRows.length === 0 ? (
                <tr><td colSpan={4} className="h-12"></td></tr>
              ) : (
                propertyAssessmentRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.actualUse}</td>
                    <td className="text-right">{formatNumber(row.adjustedMarketValue)}</td>
                    <td>{row.assessmentLevel}</td>
                    <td className="text-right font-bold">{formatNumber(row.assessedValue)}</td>
                  </tr>
                ))
              )}
              <tr className="faas-table-total">
                <td className="text-right font-bold">Total</td>
                <td className="text-right font-bold">{formatNumber(summary.totalAdjustedMarketValue)}</td>
                <td className="bg-slate-50"></td>
                <td className="text-right font-bold text-blue-800">{formatNumber(summary.totalAssessedValue)}</td>
              </tr>
            </tbody>
          </table>

          <div className="faas-row border-b bg-slate-50">
            <div className="faas-col faas-col-3 border-r">
               <span className="faas-label">Taxable:</span>
               <span className="faas-value font-bold">{propertyInfo.backPart.taxable ? 'YES' : 'NO'}</span>
            </div>
            <div className="faas-col faas-col-3 border-r">
               <span className="faas-label">Exempt:</span>
               <span className="faas-value font-bold">{propertyInfo.backPart.exempt ? 'YES' : 'NO'}</span>
            </div>
            <div className="faas-col faas-col-3 border-r">
               <span className="faas-label">Effectivity Qtr:</span>
               <span className="faas-value">{propertyInfo.backPart.effQtr}</span>
            </div>
            <div className="faas-col faas-col-3">
               <span className="faas-label">Year:</span>
               <span className="faas-value">{propertyInfo.backPart.effYear}</span>
            </div>
          </div>

          {/* Signatories at the top of the section per image */}
          <div className="faas-row py-4 border-b">
             <div className="faas-col faas-col-4">
                <div className="text-[7pt] font-bold mb-4 uppercase">Appraised/Assessed By:</div>
                <div className="w-40 border-b border-black text-center pt-2">
                   <span className="italic text-[7pt]">{propertyInfo.backPart.signatories.appraiser || ''}</span>
                </div>
                <div className="flex justify-between w-40 text-[6pt] mt-1">
                   <span></span>
                   <span className="border-t border-black px-4">Date</span>
                </div>
             </div>

             <div className="faas-col faas-col-4">
                <div className="text-[7pt] font-bold mb-4 uppercase">Recommending Approval:</div>
                <div className="w-40 border-b border-black text-center pt-2">
                   <span className="font-bold text-[7pt] uppercase">{propertyInfo.backPart.signatories.recommending || 'FELIX S. BALANSAG, JR.'}</span>
                </div>
                <div className="flex justify-between w-40 text-[6pt] mt-1">
                   <span className="text-center flex-1">MUNICIPAL ASSESSOR</span>
                   <span className="border-t border-black px-4">{formatDate(propertyInfo.backPart.signatories.recommendingDate)}</span>
                </div>
             </div>

             <div className="faas-col faas-col-4">
                <div className="text-[7pt] font-bold mb-4 uppercase">Approved By:</div>
                <div className="w-40 border-b border-black text-center pt-2">
                   <span className="font-bold text-[7pt] uppercase">{propertyInfo.backPart.signatories.approver || 'JUNIE P. VINATERO, REA'}</span>
                </div>
                <div className="flex justify-between w-40 text-[6pt] mt-1">
                   <span className="text-center flex-1">Provincial Assessor</span>
                   <span className="border-t border-black px-4">{formatDate(propertyInfo.backPart.signatories.approverDate)}</span>
                </div>
             </div>
          </div>

          {/* Memoranda Section */}
          <div className="p-2 border-b">
            <div className="text-[7pt] font-bold mb-1">MEMORANDA:</div>
            <div className="text-[7pt] leading-tight min-h-[40px]">
               {propertyInfo.backPart.memoranda || 'REVISED PERSUANT TO SEC. 219 OF RA 7160 AND AS IMPLEMENTED BY SP ORDINANCE NO. 716-2024'}
            </div>
            <div className="text-[7pt] font-bold underline mt-2">6TH GENERAL REVISION.</div>
            <div className="border-b border-slate-300 w-full mt-4"></div>
            <div className="text-[6pt] italic mt-1">(continue at the back)</div>
          </div>

          <div className="faas-row p-2 border-b">
             <div className="faas-col faas-col-6">
                <div className="text-[7pt]">Date of Entry in the Record of Assessment</div>
             </div>
             <div className="faas-col faas-col-6">
                <div className="flex justify-end gap-4 mt-4">
                   <div className="w-32 border-b border-black"></div>
                   <div className="text-[7pt]">Date</div>
                </div>
             </div>
          </div>

          {/* Superseded Assessment Section */}
          <div className="faas-section-header">RECORD OF SUPERSEDED ASSESSMENT</div>
          <div className="faas-row border-b">
             <div className="faas-col faas-col-12">
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-24">PIN:</span>
                   <span className="faas-value font-mono">{propertyInfo.backPart.superseded.pin}</span>
                </div>
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-24">TD / ARP No.</span>
                   <span className="faas-value font-mono">{propertyInfo.backPart.superseded.tdNo}</span>
                </div>
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-24">Assessed Value:</span>
                   <div className="flex gap-8">
                      <div className="flex items-center gap-2">
                         <span className="text-[7pt]">Land:</span>
                         <span className="font-bold">{formatNumber(propertyInfo.backPart.superseded.landValue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[7pt]">Impvt:</span>
                         <span className="font-bold">{formatNumber(propertyInfo.backPart.superseded.impvtValue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[7pt]">Total:</span>
                         <span className="font-bold">{formatNumber(propertyInfo.backPart.superseded.totalValue)}</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-24">Previous Owner:</span>
                   <span className="faas-value uppercase font-bold">{propertyInfo.backPart.superseded.previousOwner}</span>
                </div>
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-48">Effectivity of Assessment:</span>
                   <span className="faas-value">{propertyInfo.backPart.superseded.effectivity}</span>
                </div>
                <div className="flex items-center border-b border-slate-200 py-1">
                   <span className="faas-label w-24">AR Page No:</span>
                   <span className="faas-value">{propertyInfo.backPart.superseded.arPageNo}</span>
                </div>
                <div className="flex items-center py-1">
                   <span className="faas-label w-48">Recording Personnel:</span>
                   <span className="faas-value">{propertyInfo.backPart.superseded.recordingPersonnel}</span>
                </div>
             </div>
          </div>

          {/* Bottom signature area per image */}
          <div className="faas-row py-8 px-4">
             <div className="faas-col faas-col-4 border-b border-black"></div>
             <div className="faas-col faas-col-2"></div>
             <div className="faas-col faas-col-4 border-b border-black"></div>
             <div className="faas-col faas-col-2 flex items-end">
                <span className="text-[7pt] ml-2">Date:</span>
             </div>
          </div>

          <div className="faas-section-header mt-auto">CONTINUATION OF MEMORANDA</div>
          <div className="h-20 border-t border-slate-300"></div>
        </div>
      </div>
    </div>
  );
};

export default PrintDocument;
