import React, { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';

interface PropertyInformationTabProps {
  isEditing: boolean;
  isTransactionActive?: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

interface PropertyFormData {
  effectivityDate: string;
  tdNo: string;
  pOldTdn: string;
  updateCode: string;
  declarationDate: string;
  arpNo: string;
  tctOctCct: string;
  cancelledDate: string;
  propertyIndexNo: string;
  tctDate: string;
  district: string;
  improvementNo: string;
  cadLotNo: string;
  barangay: string;
  buildingName: string;
  surveyNo: string;
  ccn: string;
  buildingUnit: string;
  lotArea: string;
  blockNo: string;
  ownerCode: string;
  ownerNumber: string;
  ownerName: string;
  ownerAddress: string;
  adminCode: string;
  adminNumber: string;
  adminName: string;
  adminAddress: string;
  boundaryStreet: string;
  boundaryLocation: string;
  boundaryNorth: string;
  boundarySouth: string;
  boundaryEast: string;
  boundaryWest: string;
}

const defaultFormData: PropertyFormData = {
  effectivityDate: '2024-01-01',
  tdNo: 'TD-2024-001',
  pOldTdn: 'OLD-TD-2023-001',
  updateCode: 'new',
  declarationDate: '2024-01-15',
  arpNo: 'ARP-2024-001',
  tctOctCct: 'TCT-12345',
  cancelledDate: '',
  propertyIndexNo: 'PIN-001-001-001',
  tctDate: '2024-01-10',
  district: 'district1',
  improvementNo: 'IMP-001',
  cadLotNo: 'CAD-001',
  barangay: 'poblacion',
  buildingName: 'Sample Building',
  surveyNo: 'SVY-001',
  ccn: 'CCN-001',
  buildingUnit: 'Unit 1',
  lotArea: '500',
  blockNo: 'BLK-001',
  ownerCode: 'owner1',
  ownerNumber: 'OWN-001',
  ownerName: 'Juan Dela Cruz',
  ownerAddress: '123 Main St, Tubay',
  adminCode: 'admin1',
  adminNumber: 'ADM-001',
  adminName: 'Maria Santos',
  adminAddress: '456 Admin St, Tubay',
  boundaryStreet: 'Main Street',
  boundaryLocation: 'Poblacion, Tubay',
  boundaryNorth: 'Lot 002',
  boundarySouth: 'Lot 004',
  boundaryEast: 'Lot 003',
  boundaryWest: 'Main Road',
};

const PropertyInformationTab: React.FC<PropertyInformationTabProps> = ({
  isEditing,
  isTransactionActive = false,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [formData, setFormData] = useState<PropertyFormData>(defaultFormData);
  const [originalData, setOriginalData] = useState<PropertyFormData>(defaultFormData);
  const isEnabled = isEditing || isTransactionActive;

  useEffect(() => {
    if (isEditing && onDataChange) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      onDataChange(hasChanges);
    }
  }, [formData, isEditing, originalData, onDataChange]);

  const handleInputChange = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setOriginalData(formData);
    onSave();
  };

  const handleCancel = () => {
    setFormData(originalData);
    onCancel();
  };

  const updateCodeOptions = [
    { value: 'new', label: 'New' },
    { value: 'revision', label: 'Revision' },
    { value: 'correction', label: 'Correction' },
  ];

  const districtOptions = [
    { value: 'district1', label: 'District 1' },
    { value: 'district2', label: 'District 2' },
    { value: 'district3', label: 'District 3' },
  ];

  const barangayOptions = [
    { value: 'poblacion', label: 'Poblacion' },
    { value: 'tinigbasan', label: 'Tinigbasan' },
    { value: 'tagmamarkay', label: 'Tagmamarkay' },
  ];

  const renderInput = (
    label: string,
    field: keyof PropertyFormData,
    type: 'text' | 'date' | 'number' = 'text'
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        disabled={!isEditing}
        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
        data-testid={`input-${field}`}
      />
    </div>
  );

  const renderSelect = (
    label: string,
    field: keyof PropertyFormData,
    options: { value: string; label: string }[]
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        disabled={!isEditing}
        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
        data-testid={`select-${field}`}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      {/* Action Buttons */}
      <div className="mb-4 flex justify-end gap-2">
        {isEnabled && !isEditing ? (
          <button
            onClick={onEnterEdit}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-light dark:bg-primary/50 dark:hover:bg-primary text-white dark:text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            data-testid="edit-property-info-button"
          >
            <Edit2 size={14} />
            Edit Property Information
          </button>
        ) : isEditing ? (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="cancel-property-info-button"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="save-property-info-button"
            >
              <Save size={14} />
              Save Changes
            </button>
          </>
        ) : null}
      </div>

      {/* Property Information Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-4">
        <div className="bg-primary dark:bg-primary/50 px-4 py-3">
          <h3 className="text-base font-semibold text-white">Property Information</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Effectivity Date:', 'effectivityDate', 'date')}
            {renderInput('T.D. No.:', 'tdNo')}
            {renderInput('OLD T.D. No.:', 'pOldTdn')}
            {renderSelect('Update Code:', 'updateCode', updateCodeOptions)}
            {renderInput('Declaration Date:', 'declarationDate', 'date')}
            {renderInput('A.R.P No.:', 'arpNo')}
            {renderInput('TCT / OCT / CCT:', 'tctOctCct')}
            {renderInput('Cancelled Date:', 'cancelledDate', 'date')}
            {renderInput('Property Index No.:', 'propertyIndexNo')}
            {renderInput('TCT Date:', 'tctDate', 'date')}
            {renderSelect('District:', 'district', districtOptions)}
            {renderInput('Improvement No.:', 'improvementNo')}
            {renderInput('Cad. Lot No.:', 'cadLotNo')}
            {renderSelect('Barangay:', 'barangay', barangayOptions)}
            {renderInput('Building Name:', 'buildingName')}
            {renderInput('Survey No.:', 'surveyNo')}
            {renderInput('CCN:', 'ccn')}
            {renderInput('Building Unit:', 'buildingUnit')}
            {renderInput('Lot Area (sq.m.):', 'lotArea', 'number')}
            {renderInput('Block No.:', 'blockNo')}
          </div>
        </div>
      </div>

      {/* Property Owner and Administrator Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-4">
        <div className="bg-primary dark:bg-primary/50 px-4 py-3">
          <h3 className="text-base font-semibold text-white">Property Owner and Administrator</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {renderSelect('Owner Code:', 'ownerCode', [{ value: 'owner1', label: 'Owner 1' }])}
            {renderInput('Number:', 'ownerNumber')}
            {renderInput('Name:', 'ownerName')}
            {renderInput('Address:', 'ownerAddress')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderSelect('Administrator Code:', 'adminCode', [{ value: 'admin1', label: 'Admin 1' }])}
            {renderInput('Number:', 'adminNumber')}
            {renderInput('Name:', 'adminName')}
            {renderInput('Address:', 'adminAddress')}
          </div>
        </div>
      </div>

      {/* Property Boundaries Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-primary dark:bg-primary/50 px-4 py-3">
          <h3 className="text-base font-semibold text-white">Property Boundaries</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Street:', 'boundaryStreet')}
            {renderInput('Location:', 'boundaryLocation')}
            {renderInput('North:', 'boundaryNorth')}
            {renderInput('South:', 'boundarySouth')}
            {renderInput('East:', 'boundaryEast')}
            {renderInput('West:', 'boundaryWest')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyInformationTab;
