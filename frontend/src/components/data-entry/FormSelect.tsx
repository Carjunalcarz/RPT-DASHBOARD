import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  name: string;
  options: Option[];
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  placeholder?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  options,
  register,
  error,
  required = false,
  placeholder = 'Select...',
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        {...register(name, { required })}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
  );
};

export default FormSelect;
