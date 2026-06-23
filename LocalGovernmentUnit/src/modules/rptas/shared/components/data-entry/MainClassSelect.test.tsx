import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MainClassSelect from './MainClassSelect';

describe('MainClassSelect', () => {
  it('renders empty state', () => {
    render(
      <MainClassSelect
        label="Main Class"
        value=""
        options={[]}
        onValueChange={() => {}}
      />
    );

    const input = screen.getByTestId('main-class-input');
    fireEvent.focus(input);
    expect(screen.getByTestId('main-class-options')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('supports single selection', () => {
    const onValueChange = vi.fn();
    render(
      <MainClassSelect
        label="Main Class"
        value=""
        options={[{ code: 'R', description: 'RESIDENTIAL' }]}
        onValueChange={onValueChange}
      />
    );

    const input = screen.getByTestId('main-class-input');
    fireEvent.focus(input);
    fireEvent.click(screen.getByTestId('main-class-option-R'));
    expect(onValueChange).toHaveBeenCalledWith('R');
  });

  it('handles invalid input and search filtering', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <MainClassSelect
        label="Main Class"
        value=""
        options={[
          { code: 'R', description: 'RESIDENTIAL' },
          { code: 'C', description: 'COMMERCIAL' },
        ]}
        onValueChange={onValueChange}
        onInvalid={onInvalid}
      />
    );

    const input = screen.getByTestId('main-class-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'RES' } });
    expect(screen.getByTestId('main-class-option-R')).toBeInTheDocument();
    expect(screen.queryByTestId('main-class-option-C')).toBeNull();

    fireEvent.change(input, { target: { value: 'ZZ' } });
    fireEvent.blur(input);
    act(() => {
      vi.runAllTimers();
    });
    expect(onInvalid).toHaveBeenCalledWith('ZZ');
    expect(onValueChange).toHaveBeenCalledWith('');
    vi.useRealTimers();
  });

  it('keeps custom value when allowCustomValue is true', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <MainClassSelect
        label="Main Class"
        value=""
        options={[{ code: 'R', description: 'RESIDENTIAL' }]}
        onValueChange={onValueChange}
        onInvalid={onInvalid}
        allowCustomValue
      />
    );

    const input = screen.getByTestId('main-class-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ZZ' } });
    fireEvent.blur(input);
    act(() => {
      vi.runAllTimers();
    });

    expect(onValueChange).toHaveBeenCalledWith('ZZ');
    expect(onInvalid).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders on desktop, tablet, and mobile viewports', () => {
    const widths = [375, 768, 1280];
    widths.forEach((w) => {
      window.innerWidth = w;
      window.dispatchEvent(new Event('resize'));

      const { unmount } = render(
        <MainClassSelect
          label="Main Class"
          value=""
          options={[{ code: 'R', description: 'RESIDENTIAL' }]}
          onValueChange={() => {}}
        />
      );

      expect(screen.getByTestId('main-class-input')).toBeInTheDocument();
      unmount();
    });
  });
});
