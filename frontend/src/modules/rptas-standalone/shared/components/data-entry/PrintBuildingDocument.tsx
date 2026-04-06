import React from 'react';
import { BldgStrucRecord } from '@/modules/rptas/shared/services/bldgStrucService';
import { BldgAdjRecord } from '@/modules/rptas/shared/services/bldgAdjService';
import type { AssessmentRow } from '../../../../../../../LocalGovernmentUnit/src/modules/rptas/domains/RPT-management/rpt_m_types';

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

import { Calendar, ArrowUpDown, Building2 } from 'lucide-react';

interface PrintBuildingDocumentProps {
  propertyInfo: PropertyInfo;
  bldgStruc: BldgStrucRecord[];
  bldgAdj: BldgAdjRecord[];
  assessmentRows: AssessmentRow[];
  summary: {
    totalArea: number;
    totalAdjustedMarketValue: number;
    totalAssessedValue: number;
  };
}

const PrintBuildingDocument: React.FC<PrintBuildingDocumentProps> = ({
  propertyInfo,
  bldgStruc = [],
  bldgAdj = [],
  assessmentRows = [],
  summary,
}) => {
  const mainStruc = bldgStruc[0] || {} as BldgStrucRecord;

  const formatNumber = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('sv-SE'); // YYYY-MM-DD format as seen in image
    } catch (e) {
      return dateStr;
    }
  };

  const renderChecklistRow = (label: string, value: string, options: string[]) => {
    return (
      <tr className="text-[7pt]">
        <td className="border-r border-slate-300 px-1 font-medium">{label}</td>
        {options.map((opt, idx) => (
          <td key={idx} className="border-r border-slate-300 px-1 text-center">
            {value === opt ? 'X' : ''}
          </td>
        ))}
        <td className="px-1">{!options.includes(value) ? value : ''}</td>
      </tr>
    );
  };

  return (
    <div id="print-document" className="print-faas-official">
      {/* FRONT PAGE */}
      <div className="faas-page faas-page-front">
        <div className="faas-border-inner">
          {/* Header Strip Removed */}

          {/* Form Header */}
          <div className="faas-header bg-white text-black border-y-2 border-black print:bg-white print:text-black">
            <div className="text-center w-full py-1">
              <div className="font-bold text-sm">REAL PROPERTY FIELD APPRAISAL & ASSESSMENT SHEET</div>
              <div className="font-bold text-lg">BUILDING & OTHER STRUCTURES</div>
            </div>
          </div>

          <div className="flex justify-end border-b text-[8pt] px-2 py-1">
             <span className="font-bold mr-2">TRANSACTION CODE:</span>
             <span className="border-b border-black w-24 text-center">{propertyInfo.transactionCode}</span>
          </div>

          {/* Top Info Grid */}
          <div className="faas-row faas-top-info">
            <div className="faas-col faas-col-6 border-r border-b">
              <span className="faas-label">TD / ARP No.</span>
              <span className="faas-value">{propertyInfo.tdNo}</span>
            </div>
            <div className="faas-col faas-col-6 border-b">
              <span className="faas-label">PIN:</span>
              <span className="faas-value">{propertyInfo.pin}</span>
            </div>
          </div>

          {/* Owner Info Section */}
          <div className="faas-row border-b">
            <div className="faas-col faas-col-9 border-r">
              <div className="faas-row mb-1">
                <span className="faas-label w-16">OWNER:</span>
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

          {/* Building Location Section */}
          <div className="faas-section-header bg-white text-black font-bold border-t border-b border-black">BUILDING LOCATION</div>
          <div className="faas-row border-b">
            <div className="faas-col faas-col-12">
              <span className="faas-label">No./Street:</span>
              <span className="faas-value">{propertyInfo.location.street}</span>
            </div>
          </div>
          <div className="faas-row border-b">
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">Barangay:</span>
              <span className="faas-value uppercase">{propertyInfo.location.barangay}</span>
            </div>
            <div className="faas-col faas-col-4 border-r">
              <span className="faas-label">City:</span>
              <span className="faas-value uppercase">{propertyInfo.location.municipality}</span>
            </div>
            <div className="faas-col faas-col-4">
              <span className="faas-label">Province:</span>
              <span className="faas-value uppercase">{propertyInfo.location.province}</span>
            </div>
          </div>

          {/* Land Reference */}
          <div className="faas-section-header bg-white text-black font-bold border-t border-b border-black">LAND REFERENCE</div>
          <div className="faas-row border-b">
            <div className="faas-col faas-col-8 border-r">
               <span className="faas-label">Owner:</span>
               <span className="faas-value uppercase font-bold">{propertyInfo.ownerName}</span>
            </div>
             <div className="faas-col faas-col-4">
               <span className="faas-label">OCT/TCT/CLOA/CSC No.:</span>
               <span className="faas-value">{propertyInfo.octTctNo || propertyInfo.cloaCscNo}</span>
            </div>
          </div>
          <div className="faas-row border-b">
             <div className="faas-col faas-col-3 border-r">
                <span className="faas-label">Lot No.:</span>
                <span className="faas-value">{propertyInfo.lotNo}</span>
             </div>
             <div className="faas-col faas-col-3 border-r">
                <span className="faas-label">Block No.:</span>
                <span className="faas-value">{propertyInfo.blockNo}</span>
             </div>
             <div className="faas-col faas-col-6">
                <span className="faas-label">Survey No.:</span>
                <span className="faas-value">{propertyInfo.surveyNo}</span>
             </div>
          </div>
          <div className="faas-row border-b">
             <div className="faas-col faas-col-8 border-r">
                <span className="faas-label">TDN/ARP No.</span>
                <span className="faas-value">{propertyInfo.tdNo}</span>
             </div>
             <div className="faas-col faas-col-4">
                <span className="faas-label">Area:</span>
                <span className="faas-value">{summary.totalArea}</span>
             </div>
          </div>

          {/* General Description - NEW DESIGN */}
          <div className="bg-white text-black font-bold text-[9pt] px-2 py-0.5 border-t border-b border-black">GENERAL DESCRIPTION</div>
          
          <div className="faas-row border-b border-black">
             {/* Column 1: BUILDING IDENTIFICATION & PERMIT INFO */}
             <div className="faas-col faas-col-5 p-0 border-r border-black">
                <div className="bg-white text-black px-1 py-0.5 text-[7pt] font-bold border-b border-black uppercase">
                   BUILDING IDENTIFICATION & PERMIT INFO
                </div>
                
                {/* Grid Rows */}
                <div className="grid grid-cols-[140px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center">KIND OF BLDG.</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-500">{mainStruc.Actual_use || mainStruc.KIND || ''}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center">STRUCTURAL TYPE</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-900 leading-tight">{mainStruc.Struc_type || ''}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center">BLDG. PERMIT NO.</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-900">{mainStruc.Bldg_Permit || ''}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center leading-tight">CONDOMINIUM CERTIFICATE OF TITLE (CCT)</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-900 flex items-center">{mainStruc.Sub_Tdn || ''}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center leading-tight">CERTIFICATE OF COMPLETION (ISSUED ON:)</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-900 flex items-center justify-between">
                      {formatDate(mainStruc.C_complete || mainStruc.D_complete || '')}
                      <Calendar size={10} className="text-slate-500" />
                   </div>
                </div>
                <div className="grid grid-cols-[140px_1fr]">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-700 flex items-center leading-tight">CERTIFICATE OF OCCUPANCY (ISSUED ON:)</div>
                   <div className="px-1 py-1 text-[7pt] text-slate-900 flex items-center justify-between">
                      {formatDate(mainStruc.C_occupied || mainStruc.D_occupied || '')}
                      <Calendar size={10} className="text-slate-500" />
                   </div>
                </div>
             </div>

             {/* Column 2: BUILDING & FLOOR AREA DETAILS */}
             <div className="faas-col faas-col-4 p-0 border-r border-black">
                <div className="bg-white text-black px-1 py-0.5 text-[7pt] font-bold border-b border-black uppercase">
                   BUILDING & FLOOR AREA DETAILS
                </div>

                <div className="grid grid-cols-[100px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">BLDG. AGE</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium">{mainStruc.Age ? `${mainStruc.Age} Years` : ''}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">NO. OF STOREYS</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium flex justify-between items-center pl-4">
                      {mainStruc.Storey || ''}
                      <div className="bg-white border border-slate-300 rounded px-0.5">
                         <ArrowUpDown size={8} className="text-slate-500" />
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">AREA OF 1ST FLR.</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium">{mainStruc.FirstFloor ? `${mainStruc.FirstFloor} sq.ft.` : ''}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">AREA OF 2ND FLR.</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium">{mainStruc.SecondFloor ? `${mainStruc.SecondFloor} sq.ft.` : ''}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] border-b border-slate-200">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">AREA OF 3RD FLR.</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium">{mainStruc.ThirdFloor ? `${mainStruc.ThirdFloor} sq.ft.` : ''}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                   <div className="bg-white px-1 py-1 text-[6pt] font-bold text-slate-900 flex items-center">AREA OF 4TH FLR.</div>
                   <div className="px-1 py-1 text-[8pt] text-slate-900 text-center font-medium">{mainStruc.Others ? `${mainStruc.Others} sq.ft.` : ''}</div>
                </div>
             </div>
             
             {/* Column 3: FLOOR PLAN REFERENCE */}
             <div className="faas-col faas-col-3 p-0 relative flex flex-col">
                <div className="bg-white text-black border-b border-black px-1 py-0.5">
                   <span className="text-[6pt] font-bold">FLOOR PLAN REFERENCE</span>
                </div>
                <div className="flex-grow p-2 flex items-center justify-center">
                   {/* Placeholder for sketch/image */}
                   <div className="w-full h-24 border border-slate-300 bg-slate-50 flex items-center justify-center">
                      <span className="text-[6pt] text-slate-400">Floor Plan Image</span>
                   </div>
                </div>
                <div className="flex border-t border-slate-200">
                   <div className="bg-white px-1 py-0.5 text-[5pt] font-bold border-r border-slate-200">PLAN FILENAME</div>
                   <div className="px-1 py-0.5 text-[5pt] truncate">Main_Tower_Level_1-4.dwg</div>
                </div>
             </div>
          </div>
          
          {/* Summary & Totals */}
          <div className="faas-row border-b border-black">
             <div className="faas-col faas-col-12 p-0">
                <div className="bg-white text-black border-b border-slate-200 px-1 py-0.5">
                   <span className="text-[6pt] font-bold">SUMMARY & TOTALS</span>
                </div>
                <div className="flex">
                   <div className="w-1/3 border-r border-slate-300 px-2 py-1 flex items-center justify-between">
                      <span className="text-[6pt] font-bold text-slate-700">DATE CONSTRUCTED/COMPLETED:</span>
                      <span className="text-[8pt] font-bold text-black">{formatDate(mainStruc.D_construct || '')}</span>
                   </div>
                   <div className="w-1/3 border-r border-slate-300 px-2 py-1 flex items-center justify-between">
                      <span className="text-[6pt] font-bold text-slate-700">DATE OCCUPIED:</span>
                      <span className="text-[8pt] font-bold text-black">{formatDate(mainStruc.D_occupied || '')}</span>
                   </div>
                   <div className="w-1/3 px-2 py-1 flex flex-col justify-center relative">
                      <span className="text-[6pt] font-bold text-slate-700">TOTAL FLOOR AREA:</span>
                      <span className="text-[12pt] font-bold text-black leading-none">{mainStruc.Total_Area || mainStruc.Floor_area || '0'} sq.ft.</span>
                      <div className="absolute bottom-0 right-1 text-slate-300">
                         <Building2 size={24} strokeWidth={1} />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Structural Materials */}
          <div className="faas-section-header bg-white text-black font-bold border-t border-b border-black">STRUCTURAL MATERIALS (CHECKLISTS)</div>
          
          <div className="flex border-b border-black text-[7pt]">
             {/* Foundation */}
             <div className="w-1/4 border-r border-black">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <span>FOUNDATION</span>
                   {/* Foundation Icon */}
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 20h16v2H4zM2 16h20v2H2zM6 10h12v6H6z" />
                   </svg>
                </div>
                <div className="p-1 space-y-1">
                   {['Steel', 'Reinforced Concrete', 'Plain Concrete'].map(item => (
                      <div key={item} className="flex justify-between items-center">
                         <span>{item}</span>
                         <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                            {mainStruc.Foundation === item ? '✓' : ''}
                         </div>
                      </div>
                   ))}
                   <div className="flex justify-between items-end mt-1">
                      <span className="whitespace-nowrap mr-1">Others (Specify)</span>
                      <div className="border-b border-black flex-grow flex justify-between items-center px-1">
                         <span>{!['Steel', 'Reinforced Concrete', 'Plain Concrete'].includes(mainStruc.Foundation || '') ? mainStruc.Foundation : ''}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Columns */}
             <div className="w-1/4 border-r border-black">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <span>COLUMNS</span>
                   {/* I-Beam Icon */}
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16v4h-6v8h6v4H4v-4h6V8H4z" />
                   </svg>
                </div>
                <div className="p-1 space-y-1">
                   {['Steel', 'Reinforced Concrete', 'Wood'].map(item => (
                      <div key={item} className="flex justify-between items-center">
                         <span>{item}</span>
                         <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                            {mainStruc.Posts === item ? '✓' : ''}
                         </div>
                      </div>
                   ))}
                   <div className="flex justify-between items-end mt-1">
                      <span className="whitespace-nowrap mr-1">Others (Specify)</span>
                      <div className="border-b border-black flex-grow flex justify-between items-center px-1">
                         <span>{!['Steel', 'Reinforced Concrete', 'Wood'].includes(mainStruc.Posts || '') ? mainStruc.Posts : ''}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Beams */}
             <div className="w-1/4 border-r border-black">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <span>BEAMS</span>
                   {/* Beam Icon */}
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 10h20v4H2zM2 6h20v2H2zM2 16h20v2H2z" />
                   </svg>
                </div>
                <div className="p-1 space-y-1">
                   {['Steel', 'Reinforced Concrete', 'Wood'].map(item => (
                      <div key={item} className="flex justify-between items-center">
                         <span>{item}</span>
                         <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                            {mainStruc.Beams === item ? '✓' : ''}
                         </div>
                      </div>
                   ))}
                   <div className="flex justify-between items-end mt-1">
                      <span className="whitespace-nowrap mr-1">Others (Specify)</span>
                      <div className="border-b border-black flex-grow flex justify-between items-center px-1">
                         <span>{!['Steel', 'Reinforced Concrete', 'Wood'].includes(mainStruc.Beams || '') ? mainStruc.Beams : ''}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Truss Framing */}
             <div className="w-1/4">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <span>TRUSS FRAMING</span>
                   {/* Truss Icon */}
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 22h20L12 2 2 22zM12 6v16M6 14l12 0" />
                   </svg>
                </div>
                <div className="p-1 space-y-1">
                   <div className="flex justify-between items-center mt-4">
                      <span>Wood</span>
                      <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                         {mainStruc.Truss_Framing === 'Wood' ? '✓' : ''}
                      </div>
                   </div>
                   <div className="flex justify-between items-end mt-4">
                      <span className="whitespace-nowrap mr-1">Others (Specify)</span>
                      <div className="border-b border-black flex-grow flex justify-between items-center px-1">
                         <span>{mainStruc.Truss_Framing !== 'Wood' ? mainStruc.Truss_Framing : ''}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex border-b border-black text-[7pt]">
             {/* Roof */}
             <div className="w-1/4 border-r border-black">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <span>ROOF</span>
                   {/* Roof Icon */}
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12h20L12 2 2 12z" />
                   </svg>
                </div>
                <div className="p-1 space-y-1">
                   {['Reinforced Concrete', 'Tiles', 'G.I. Sheet', 'Aluminum', 'Asbestos', 'Long Span', 'Concrete Deck'].map(item => (
                      <div key={item} className="flex justify-between items-center h-4">
                         <span>{item}</span>
                         <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                            {mainStruc.Roof === item ? '✓' : ''}
                         </div>
                      </div>
                   ))}
                   <div className="flex justify-between items-center h-4">
                      <span className="text-[6pt]">Nipa/Anahaw/Cogon</span>
                      <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                         {['Nipa', 'Anahaw', 'Cogon'].some(i => mainStruc.Roof?.includes(i)) ? '✓' : ''}
                      </div>
                   </div>
                   <div className="flex justify-between items-end mt-1">
                      <span className="whitespace-nowrap mr-1">Others (Specify)</span>
                      <div className="border-b border-black flex-grow flex justify-between items-center px-1">
                         <span></span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Flooring */}
             <div className="w-[37.5%] border-r border-black flex flex-col">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <div className="flex items-center">
                      <span>FLOORING</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
                         <rect x="2" y="2" width="20" height="20" rx="2" />
                         <path d="M2 12h20M12 2v20" />
                      </svg>
                   </div>
                   <div className="flex text-[6pt] gap-1 mr-1">
                      <span className="w-5 text-center leading-none">1ST<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">2ND<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">3RD<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">4TH<br/>FLR.</span>
                   </div>
                </div>
                <div className="flex-grow">
                   {['Reinforced Concrete', 'Plain Cement', 'Marble', 'Wood', 'Tiles'].map((item, idx) => (
                      <div key={idx} className={`flex items-center h-5 border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : ''}`}>
                         <span className="flex-1 px-1 truncate">{item}</span>
                         <div className="flex gap-1 pr-1">
                            {[1, 2, 3, 4].map(floor => (
                               <div key={floor} className="w-5 flex justify-center">
                                  <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                                     {mainStruc.Flooring === item && floor === 1 ? '✓' : ''}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                   <div className="flex items-center h-5 mt-auto mb-1">
                      <div className="flex-1 px-1 flex items-end">
                         <span className="whitespace-nowrap mr-1 text-[6pt]">Others (Specify)</span>
                         <div className="border-b border-black w-8 flex items-center">
                         </div>
                      </div>
                      <div className="flex gap-1 pr-1">
                         {[1, 2, 3, 4].map(floor => (
                            <div key={floor} className="w-5 flex justify-center">
                               <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white"></div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             {/* Walls & Partitions */}
             <div className="w-[37.5%] flex flex-col">
                <div className="bg-white font-bold px-1 py-0.5 border-b border-black flex justify-between items-center">
                   <div className="flex items-center">
                      <span className="leading-tight">WALLS &<br/>PARTITIONS</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
                         <path d="M4 22h16M4 2h16M4 2v20M20 2v20" />
                         <path d="M12 2v20" />
                      </svg>
                   </div>
                   <div className="flex text-[6pt] gap-1 mr-1">
                      <span className="w-5 text-center leading-none">1ST<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">2ND<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">3RD<br/>FLR.</span>
                      <span className="w-5 text-center leading-none">4TH<br/>FLR.</span>
                   </div>
                </div>
                <div className="flex-grow">
                   {['Reinforced Concrete', 'Plain Concrete', 'Wood', 'CHB', 'G.I. Sheet', 'Build-a-wall', 'Sawali'].map((item, idx) => (
                      <div key={idx} className={`flex items-center h-5 border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : ''}`}>
                         <span className="flex-1 px-1 truncate">{item}</span>
                         <div className="flex gap-1 pr-1">
                            {[1, 2, 3, 4].map(floor => (
                               <div key={floor} className="w-5 flex justify-center">
                                  <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white">
                                     {(mainStruc.Ext_Walls === item || mainStruc.Partition === item) && floor === 1 ? '✓' : ''}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                   <div className="flex items-center h-5 mt-auto mb-1">
                      <div className="flex-1 px-1 flex items-end">
                         <span className="whitespace-nowrap mr-1 text-[6pt]">Others (Specify)</span>
                         <div className="border-b border-black flex-grow flex items-center justify-end px-1">
                         </div>
                      </div>
                      <div className="flex gap-1 pr-1">
                         {[1, 2, 3, 4].map(floor => (
                            <div key={floor} className="w-5 flex justify-center">
                               <div className="w-3 h-3 border border-slate-500 flex items-center justify-center bg-white"></div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="faas-page-break"></div>

      {/* BACK PAGE */}
      <div className="faas-page faas-page-back">
        <div className="faas-border-inner">
          {/* Property Appraisal */}
          <div className="faas-section-header">PROPERTY APPRAISAL</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Area</th>
                <th>Unit Value</th>
                <th>Market Value</th>
              </tr>
            </thead>
            <tbody>
               {/* Main Building */}
               <tr>
                  <td>
                     <div className="font-bold">{mainStruc.KIND || 'MAIN BUILDING'}</div>
                     <div className="text-xs">{mainStruc.Struc_type}</div>
                  </td>
                  <td className="text-right">{mainStruc.Total_Area || mainStruc.Floor_area}</td>
                  <td className="text-right">{formatNumber(mainStruc.UNIT_VALUE)}</td>
                  <td className="text-right">{formatNumber(mainStruc.Market_Val)}</td>
               </tr>
               {/* Adjustments/Additional Items mapped to Appraisal if needed, or kept separate */}
            </tbody>
          </table>

          {/* Additional Items */}
          <div className="faas-section-header">ADDITIONAL ITEMS:</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Area</th>
                <th>Unit Value</th>
                <th>Market Value</th>
              </tr>
            </thead>
            <tbody>
              {bldgAdj.length === 0 ? (
                <tr><td colSpan={4} className="h-12"></td></tr>
              ) : (
                bldgAdj.map((adj, idx) => (
                  <tr key={idx}>
                    <td>{adj.DescNote || adj.KIND}</td>
                    <td className="text-right">{adj.Area}</td>
                    <td className="text-right">{formatNumber(adj.UnitCost)}</td>
                    <td className="text-right">{formatNumber(adj.Market_Val)}</td>
                  </tr>
                ))
              )}
               <tr className="faas-table-total">
                <td colSpan={3} className="text-right font-bold">TOTAL</td>
                <td className="text-right font-bold">{formatNumber(summary.totalAdjustedMarketValue)}</td>
              </tr>
            </tbody>
          </table>

          {/* Property Assessment Section */}
          <div className="faas-section-header">PROPERTY ASSESSMENT</div>
          <table className="faas-table">
            <thead>
              <tr>
                <th>Actual Use</th>
                <th className="text-right">Market Value (Php)</th>
                <th>Assessment Level (%)</th>
                <th className="text-right">Assessed Value (Php)</th>
              </tr>
            </thead>
            <tbody>
              {assessmentRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.actualUse}</td>
                    <td className="text-right">{formatNumber(row.adjustedMarketValue)}</td>
                    <td>{row.assessmentLevel}</td>
                    <td className="text-right font-bold">{formatNumber(row.assessedValue)}</td>
                  </tr>
                ))}
              <tr className="faas-table-total">
                <td className="text-right font-bold">Total</td>
                <td className="text-right font-bold">{formatNumber(summary.totalAdjustedMarketValue)}</td>
                <td className="bg-slate-50"></td>
                <td className="text-right font-bold text-blue-800">{formatNumber(summary.totalAssessedValue)}</td>
              </tr>
            </tbody>
          </table>

          <div className="faas-row border-b">
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

          {/* Signatories exactly as per image */}
          <div className="py-2 border-b space-y-4 px-4">
             {/* First Row: Appraised and Recommending */}
             <div className="flex justify-between items-start">
                <div className="flex-1 max-w-[45%]">
                   <div className="text-[7pt] font-bold mb-2 uppercase text-left">APPRAISED/ASSESSED BY:</div>
                   <div className="flex gap-4 items-end pr-4">
                      <div className="flex-1 border-b border-black text-center min-h-[16px]">
                         <span className="text-[8pt] font-medium">{propertyInfo.backPart.signatories.appraiser || ''}</span>
                      </div>
                      <div className="w-24 border-b border-black text-center min-h-[16px]">
                         <span className="text-[8pt]">{formatDate(propertyInfo.backPart.signatories.appraiserDate)}</span>
                      </div>
                   </div>
                   <div className="flex gap-4 text-[7pt] mt-1 pr-4">
                      <div className="flex-1"></div>
                      <div className="w-24 text-center">Date</div>
                   </div>
                </div>

                <div className="flex-1 max-w-[45%]">
                   <div className="text-[7pt] font-bold mb-2 uppercase text-left">RECOMMENDING APPROVAL:</div>
                   <div className="flex gap-4 items-end pl-4">
                      <div className="flex-1 border-b border-black text-center min-h-[16px]">
                         <span className="text-[8pt] font-bold uppercase">{propertyInfo.backPart.signatories.recommending || 'FELIX S. BALANSAG, JR.'}</span>
                      </div>
                      <div className="w-24 border-b border-black text-center min-h-[16px]">
                         <span className="text-[8pt]"></span>
                      </div>
                   </div>
                   <div className="flex gap-4 text-[7pt] mt-1 pl-4">
                      <div className="flex-1 text-center italic text-slate-700">MUNICIPAL ASSESSOR</div>
                      <div className="w-24 text-center">Date</div>
                   </div>
                </div>
             </div>

             {/* Second Row: Approved By */}
             <div className="max-w-[60%]">
                <div className="text-[7pt] font-bold mb-2 uppercase text-left">APPROVED BY:</div>
                <div className="flex gap-4 items-end ml-16 pr-4">
                   <div className="flex-1 border-b border-black text-center min-h-[16px]">
                      <span className="text-[8pt] font-bold uppercase whitespace-nowrap">{propertyInfo.backPart.signatories.approver || 'JUNIE P. VINATERO, REA'}</span>
                   </div>
                   <div className="w-24 border-b border-black text-center min-h-[16px]">
                      <span className="text-[8pt]">{propertyInfo.backPart.signatories.approverDate !== 'N/A' ? formatDate(propertyInfo.backPart.signatories.approverDate) : ''}</span>
                   </div>
                </div>
                <div className="flex gap-4 text-[7pt] mt-1 ml-16 pr-4">
                   <div className="flex-1 text-center italic font-bold">Provincial Assessor</div>
                   <div className="w-24 text-center">Date</div>
                </div>
             </div>
          </div>

          {/* Memoranda Section */}
          <div className="p-2 border-b min-h-[60px]">
            <div className="text-[7pt] font-bold mb-1">MEMORANDA:</div>
            <div className="text-[7pt] leading-tight">
               {propertyInfo.backPart.memoranda || ''}
            </div>
          </div>

          <div className="faas-row p-2 border-b">
             <div className="faas-col faas-col-6">
                <div className="text-[7pt]">Date of Entry in the Record of Assessment</div>
             </div>
             <div className="faas-col faas-col-6">
                <div className="flex justify-end gap-4 mt-4">
                   <div className="w-32 border-b border-black text-center text-[8pt]">{propertyInfo.backPart.superseded.effectivity}</div>
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

export default PrintBuildingDocument;
