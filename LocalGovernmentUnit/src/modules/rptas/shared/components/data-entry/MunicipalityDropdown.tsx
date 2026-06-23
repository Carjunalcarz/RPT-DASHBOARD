import React, { useMemo, useState } from 'react';
import type { Municipality } from '@/services/landTaxService';

type CityInfoSource = {
  CITY?: string;
  PROV?: string;
  REGION?: string;
  DISTRICT?: string;
};

type Props = {
  label: string;
  value: string;
  options: Municipality[];
  onValueChange: (value: string) => void;
  cityInfo?: CityInfoSource;
  matchCityCode?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  'data-testid'?: string;
};

const looksLikeCode = (v: string) => /^[0-9]{1,3}$/.test(v.trim());

const MunicipalityDropdown: React.FC<Props> = ({
  label,
  value,
  options,
  onValueChange,
  cityInfo,
  matchCityCode = '04',
  disabled = false,
  className,
  selectClassName,
  'data-testid': dataTestId,
}) => {
  const [error, setError] = useState<string | null>(null);

  const normalizedOptions = useMemo(() => {
    const seen = new Set<string>();
    const cleaned = (options || [])
      .filter((o) => o && typeof o.code === 'string' && typeof o.name === 'string')
      .map((o) => ({ code: o.code.trim(), name: o.name.trim() }))
      .filter((o) => o.code && o.name)
      .filter((o) => {
        const key = o.code.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    cleaned.sort((a, b) => a.name.localeCompare(b.name));
    return cleaned;
  }, [options]);

  const selectedOption = useMemo(() => {
    const v = String(value || '').trim();
    if (!v) return null;
    return (
      normalizedOptions.find((o) => o.code === v) ||
      normalizedOptions.find((o) => o.name.toLowerCase() === v.toLowerCase()) ||
      null
    );
  }, [normalizedOptions, value]);

  const selectedCode = useMemo(() => {
    const v = String(value || '').trim();
    if (selectedOption?.code) return selectedOption.code;
    if (looksLikeCode(v)) return v.padStart(2, '0');
    return null;
  }, [selectedOption?.code, value]);

  const shouldShowCity = useMemo(() => {
    const jsonCity = String(cityInfo?.CITY || '').trim();
    if (jsonCity) {
      return jsonCity === matchCityCode && selectedCode === matchCityCode;
    }
    return selectedCode === matchCityCode;
  }, [cityInfo?.CITY, matchCityCode, selectedCode]);

  const cityDetails = useMemo(() => {
    if (!shouldShowCity) return null;
    return {
      code: matchCityCode,
      municipality: selectedOption?.name || 'Selected municipality',
      region: cityInfo?.REGION || null,
      province: cityInfo?.PROV || null,
      district: cityInfo?.DISTRICT || null,
    };
  }, [cityInfo?.DISTRICT, cityInfo?.PROV, cityInfo?.REGION, matchCityCode, selectedOption?.name, shouldShowCity]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!next) {
      setError(null);
      onValueChange('');
      return;
    }
    const exists = normalizedOptions.some((o) => o.code === next);
    if (!exists) {
      setError('Invalid municipality selection.');
      return;
    }
    setError(null);
    onValueChange(next);
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="w-28 text-xs font-medium text-foreground dark:text-foreground sm:text-right">
          {label}
        </label>
        <div className="flex-1">
          <select
            value={selectedOption?.code || ''}
            onChange={handleChange}
            disabled={disabled || normalizedOptions.length === 0}
            className={
              selectClassName ||
              'w-full px-2 py-1.5 text-xs bg-surface dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed'
            }
            data-testid={dataTestId}
          >
            <option value="">Select Municipality</option>
            {normalizedOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          {error ? <div className="mt-1 text-[11px] text-destructive">{error}</div> : null}
          {normalizedOptions.length === 0 ? (
            <div className="mt-1 text-[11px] text-muted dark:text-muted">
              No municipality data available.
            </div>
          ) : null}
          {cityDetails ? (
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2">
              <div className="text-xs font-semibold text-foreground dark:text-foreground">
                City matched (CITY {cityDetails.code})
              </div>
              <div className="text-[11px] text-muted dark:text-muted">
                {cityDetails.municipality}
                {cityDetails.region ? ` • Region ${cityDetails.region}` : ''}
                {cityDetails.province ? ` • Prov ${cityDetails.province}` : ''}
                {cityDetails.district ? ` • District ${cityDetails.district}` : ''}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MunicipalityDropdown;

