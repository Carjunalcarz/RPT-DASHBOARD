import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  error,
  required = false,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        {...register(name, { required })}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
  );
};

export default FormInput;
