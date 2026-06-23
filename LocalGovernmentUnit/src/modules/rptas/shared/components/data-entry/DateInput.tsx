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
      <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="date"
        {...register(name, { required })}
        className="w-full px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-600 text-foreground dark:text-surface sm:px-2 sm:py-1.5 sm:text-xs sm:rounded-md sm:focus:ring-1"
      />
      {error && <p className="text-red-500 dark:text-danger text-xs mt-1">{error.message}</p>}
    </div>
  );
};

export default DateInput;
