import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface DateInputProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  name,
  register,
  error,
  required = false,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="date"
        {...register(name, { required })}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
      />
      {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error.message}</p>}
    </div>
  );
};

export default DateInput;
