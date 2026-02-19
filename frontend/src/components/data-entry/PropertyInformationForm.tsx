import React from 'react';
import { useForm } from 'react-hook-form';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import DateInput from './DateInput';

interface PropertyFormData {
  effectivityDate: string;
  tdNo: string;
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
}

const PropertyInformationForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<PropertyFormData>();

  const onSubmit = (data: PropertyFormData) => {
    console.log('Form data:', data);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-8">
      {/* Property Information Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="bg-blue-600 dark:bg-blue-500 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Property Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <DateInput
              label="Effectivity Date:"
              name="effectivityDate"
              register={register}
              error={errors.effectivityDate}
            />
            <FormInput
              label="T.D. No.:"
              name="tdNo"
              register={register}
              error={errors.tdNo}
            />
            <FormSelect
              label="Update Code:"
              name="updateCode"
              options={updateCodeOptions}
              register={register}
              error={errors.updateCode}
              placeholder="Select Code"
            />

            {/* Row 2 */}
            <DateInput
              label="Declaration Date:"
              name="declarationDate"
              register={register}
              error={errors.declarationDate}
            />
            <FormInput
              label="A.R.P No.:"
              name="arpNo"
              register={register}
              error={errors.arpNo}
            />
            <FormInput
              label="TCT / OCT / CCT:"
              name="tctOctCct"
              register={register}
              error={errors.tctOctCct}
            />

            {/* Row 3 */}
            <DateInput
              label="Cancelled Date:"
              name="cancelledDate"
              register={register}
              error={errors.cancelledDate}
            />
            <FormInput
              label="Property Index No.:"
              name="propertyIndexNo"
              register={register}
              error={errors.propertyIndexNo}
            />
            <DateInput
              label="TCT Date:"
              name="tctDate"
              register={register}
              error={errors.tctDate}
            />

            {/* Row 4 */}
            <FormSelect
              label="District:"
              name="district"
              options={districtOptions}
              register={register}
              error={errors.district}
              placeholder="Select District"
            />
            <FormInput
              label="Improvement No.:"
              name="improvementNo"
              register={register}
              error={errors.improvementNo}
            />
            <FormInput
              label="Cad. Lot No.:"
              name="cadLotNo"
              register={register}
              error={errors.cadLotNo}
            />

            {/* Row 5 */}
            <FormSelect
              label="Barangay:"
              name="barangay"
              options={barangayOptions}
              register={register}
              error={errors.barangay}
              placeholder="Select Barangay"
            />
            <FormInput
              label="Building Name:"
              name="buildingName"
              register={register}
              error={errors.buildingName}
            />
            <FormInput
              label="Survey No.:"
              name="surveyNo"
              register={register}
              error={errors.surveyNo}
            />

            {/* Row 6 */}
            <FormInput
              label="CCN:"
              name="ccn"
              register={register}
              error={errors.ccn}
            />
            <FormInput
              label="Building Unit:"
              name="buildingUnit"
              register={register}
              error={errors.buildingUnit}
            />
            <FormInput
              label="Block No.:"
              name="blockNo"
              register={register}
              error={errors.blockNo}
            />

            {/* Row 7 - Lot Area */}
            <FormInput
              label="Lot Area:"
              name="lotArea"
              type="number"
              register={register}
              error={errors.lotArea}
              placeholder="sq.m."
            />
          </div>
        </div>
      </div>

      {/* Property Owner and Administrator Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="bg-blue-600 dark:bg-blue-500 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Property Owner and Administrator</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <FormSelect
              label="Owner Code:"
              name="ownerCode"
              options={[{ value: 'owner1', label: 'Owner 1' }]}
              register={register}
              placeholder="Select"
            />
            <FormInput label="Number:" name="ownerNumber" register={register} />
            <FormInput label="Name:" name="ownerName" register={register} />
            <FormInput label="Address:" name="ownerAddress" register={register} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <FormSelect
              label="Administrator Code:"
              name="adminCode"
              options={[{ value: 'admin1', label: 'Admin 1' }]}
              register={register}
              placeholder="Select"
            />
            <FormInput label="Number:" name="adminNumber" register={register} />
            <FormInput label="Name:" name="adminName" register={register} />
            <FormInput label="Address:" name="adminAddress" register={register} />
          </div>
        </div>
      </div>

      {/* Property Boundaries Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="bg-blue-600 dark:bg-blue-500 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Property Boundaries</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Street:" name="boundaryStreet" register={register} />
            <FormInput label="Location:" name="boundaryLocation" register={register} />
            <FormInput label="North:" name="boundaryNorth" register={register} />
            <FormInput label="South:" name="boundarySouth" register={register} />
            <FormInput label="East:" name="boundaryEast" register={register} />
            <FormInput label="West:" name="boundaryWest" register={register} />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
        >
          Save Property Information
        </button>
      </div>
    </form>
  );
};

export default PropertyInformationForm;
