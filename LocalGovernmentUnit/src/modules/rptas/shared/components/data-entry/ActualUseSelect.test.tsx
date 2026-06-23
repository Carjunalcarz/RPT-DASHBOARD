import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ActualUseSelect from './ActualUseSelect';

describe('ActualUseSelect', () => {
  it('renders empty state', () => {
    render(<ActualUseSelect label="Actual Use" value="" options={[]} onValueChange={() => {}} />);
    const input = screen.getByTestId('actual-use-input');
    fireEvent.focus(input);
    expect(screen.getByTestId('actual-use-options')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('supports single selection', () => {
    const onValueChange = vi.fn();
    render(
      <ActualUseSelect
        label="Actual Use"
        value=""
        options={[{ code: 'RESILOT', description: 'RESIDENTIAL LOT' }]}
        onValueChange={onValueChange}
      />
    );
    const input = screen.getByTestId('actual-use-input');
    fireEvent.focus(input);
    fireEvent.click(screen.getByTestId('actual-use-option-RESILOT'));
    expect(onValueChange).toHaveBeenCalledWith('RESILOT');
  });

  it('handles invalid input and search filtering', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <ActualUseSelect
        label="Actual Use"
        value=""
        options={[
          { code: 'RESILOT', description: 'RESIDENTIAL LOT' },
          { code: 'COMLOT', description: 'COMMERCIAL LOT' },
        ]}
        onValueChange={onValueChange}
        onInvalid={onInvalid}
      />
    );

    const input = screen.getByTestId('actual-use-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'RESI' } });
    expect(screen.getByTestId('actual-use-option-RESILOT')).toBeInTheDocument();
    expect(screen.queryByTestId('actual-use-option-COMLOT')).toBeNull();

    fireEvent.change(input, { target: { value: 'ZZZ' } });
    fireEvent.blur(input);
    act(() => {
      vi.runAllTimers();
    });
    expect(onInvalid).toHaveBeenCalledWith('ZZZ');
    expect(onValueChange).toHaveBeenCalledWith('');
    vi.useRealTimers();
  });

  it('keeps custom value when allowCustomValue is true', () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <ActualUseSelect
        label="Actual Use"
        value=""
        options={[{ code: 'RESILOT', description: 'RESIDENTIAL LOT' }]}
        onValueChange={onValueChange}
        onInvalid={onInvalid}
        allowCustomValue
      />
    );

    const input = screen.getByTestId('actual-use-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ZZZ' } });
    fireEvent.blur(input);
    act(() => {
      vi.runAllTimers();
    });

    expect(onValueChange).toHaveBeenCalledWith('ZZZ');
    expect(onInvalid).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders on desktop, tablet, and mobile viewports', () => {
    const widths = [375, 768, 1280];
    widths.forEach((w) => {
      window.innerWidth = w;
      window.dispatchEvent(new Event('resize'));

      const { unmount } = render(
        <ActualUseSelect
          label="Actual Use"
          value=""
          options={[{ code: 'RESILOT', description: 'RESIDENTIAL LOT' }]}
          onValueChange={() => {}}
        />
      );

      expect(screen.getByTestId('actual-use-input')).toBeInTheDocument();
      unmount();
    });
  });
});
