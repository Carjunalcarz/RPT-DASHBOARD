interface BudgetYearFilterProps {
  value: string
  years: number[]
  onChange: (value: string) => void
  allLabel?: string
  ariaLabel?: string
  minWidthClassName?: string
}

export function BudgetYearFilter({
  value,
  years,
  onChange,
  allLabel = 'All Years',
  ariaLabel = 'Filter by year',
  minWidthClassName = 'min-w-[140px]',
}: BudgetYearFilterProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={`px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success transition-colors ${minWidthClassName}`}
    >
      <option value="all">{allLabel}</option>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  )
}
