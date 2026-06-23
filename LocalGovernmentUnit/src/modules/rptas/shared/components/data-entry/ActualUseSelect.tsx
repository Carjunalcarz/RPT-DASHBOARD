import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ActualUseOption = {
  code: string;
  description: string;
};

type Props = {
  label: string;
  value: string;
  options: ActualUseOption[];
  onValueChange: (value: string) => void;
  onInvalid?: (value: string) => void;
  allowCustomValue?: boolean;
  showDescriptionInInput?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  inputClassName?: string;
  'data-testid'?: string;
};

const ActualUseSelect: React.FC<Props> = ({
  label,
  value,
  options,
  onValueChange,
  onInvalid,
  allowCustomValue = false,
  showDescriptionInInput = false,
  placeholder = 'Select Actual Use',
  disabled,
  required,
  error,
  inputClassName,
  'data-testid': dataTestId,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingCommitRef = useRef<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ left: number; top: number; width: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!focused) setQuery(value || '');
  }, [focused, value]);

  const normalizedOptions = useMemo(() => {
    return (options || [])
      .map((o) => ({
        code: String(o.code || '').trim().toUpperCase(),
        description: String(o.description || '').trim(),
      }))
      .filter((o) => o.code);
  }, [options]);

  const optionByCode = useMemo(() => {
    const map = new Map<string, ActualUseOption>();
    normalizedOptions.forEach((o) => map.set(o.code, o));
    return map;
  }, [normalizedOptions]);

  const displayValue = useMemo(() => {
    if (!showDescriptionInInput) return query;
    const code = String(value || '').trim().toUpperCase();
    if (!code) return '';
    const desc = optionByCode.get(code)?.description;
    return desc ? `${code} - ${desc}` : code;
  }, [optionByCode, query, showDescriptionInInput, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((o) => o.code.includes(q) || o.description.toUpperCase().includes(q));
  }, [normalizedOptions, query]);

  const commitValue = (next: string) => {
    const v = String(next || '').trim().toUpperCase();
    if (v === '') {
      onValueChange('');
      return;
    }
    if (optionByCode.has(v)) {
      onValueChange(v);
      return;
    }
    if (allowCustomValue) {
      onValueChange(v);
      setQuery(v);
      return;
    }
    onInvalid?.(v);
    onValueChange('');
    setQuery('');
  };

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapperRef.current?.querySelector('input');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchorRect({ left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      {label ? (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      <input
        value={focused ? query : displayValue}
        onChange={(e) => {
          pendingCommitRef.current = null;
          setQuery(e.target.value);
          setOpen(true);
          const maybe = String(e.target.value || '').trim().toUpperCase();
          if (optionByCode.has(maybe)) onValueChange(maybe);
        }}
        onFocus={() => {
          pendingCommitRef.current = null;
          setFocused(true);
          setQuery(String(value || '').trim().toUpperCase());
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            const next = pendingCommitRef.current ?? query;
            pendingCommitRef.current = null;
            commitValue(next);
            setFocused(false);
          }, 0);
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={
          inputClassName ||
          'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed'
        }
        data-testid={dataTestId || 'actual-use-input'}
        aria-invalid={Boolean(error) || undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && anchorRect
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              className="max-h-64 overflow-y-auto rounded-md border border-border bg-background shadow-sm"
              style={{
                position: 'fixed',
                left: anchorRect.left,
                top:
                  window.innerHeight - anchorRect.bottom < 260
                    ? Math.max(8, anchorRect.top - 4 - 260)
                    : anchorRect.bottom + 4,
                width: anchorRect.width,
                zIndex: 9999,
              }}
              data-testid="actual-use-options"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    role="option"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/20"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      pendingCommitRef.current = o.code;
                      setQuery(o.code);
                      setOpen(false);
                      onValueChange(o.code);
                      setFocused(false);
                    }}
                    data-testid={`actual-use-option-${o.code}`}
                  >
                    <span className="text-muted-foreground">{o.code}</span>
                    <span className="text-muted-foreground"> - </span>
                    <span className="text-foreground">{o.description}</span>
                  </button>
                ))
              )}
            </div>,
            document.body
          )
        : null}
      {error ? <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p> : null}
    </div>
  );
};

export default ActualUseSelect;
