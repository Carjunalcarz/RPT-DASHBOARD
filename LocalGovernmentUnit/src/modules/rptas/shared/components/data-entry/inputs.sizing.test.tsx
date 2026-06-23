import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import FormInput from './FormInput';
import DateInput from './DateInput';
import FormSelect from './FormSelect';

describe('data-entry inputs sizing', () => {
  it('renders FormInput with responsive compact sizing classes', () => {
    const Wrapper = () => {
      const { register } = useForm();
      return <FormInput label="Field" name="field" register={register} />;
    };
    render(<Wrapper />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('w-full');
    expect(input.className).toContain('sm:px-2');
    expect(input.className).toContain('sm:py-1.5');
    expect(input.className).toContain('sm:text-xs');
  });

  it('renders DateInput with responsive compact sizing classes', () => {
    const Wrapper = () => {
      const { register } = useForm();
      return <DateInput label="Date" name="date" register={register} />;
    };
    const { container } = render(<Wrapper />);
    const input = container.querySelector('input[type="date"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.className).toContain('sm:px-2');
    expect(input!.className).toContain('sm:py-1.5');
    expect(input!.className).toContain('sm:text-xs');
  });

  it('renders FormSelect with responsive compact sizing classes', () => {
    const Wrapper = () => {
      const { register } = useForm();
      return (
        <FormSelect
          label="Select"
          name="select"
          options={[{ value: 'a', label: 'A' }]}
          register={register}
        />
      );
    };
    render(<Wrapper />);
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('sm:px-2');
    expect(select.className).toContain('sm:py-1.5');
    expect(select.className).toContain('sm:text-xs');
  });
});

