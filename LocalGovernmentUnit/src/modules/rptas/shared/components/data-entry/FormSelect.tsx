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
      <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        {...register(name, { required })}
        className="w-full px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-600 text-foreground dark:text-surface sm:px-2 sm:py-1.5 sm:text-xs sm:rounded-md sm:focus:ring-1"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 dark:text-danger text-xs mt-1">{error.message || 'This field is required'}</p>}
    </div>
  );
};

export default FormSelect;
