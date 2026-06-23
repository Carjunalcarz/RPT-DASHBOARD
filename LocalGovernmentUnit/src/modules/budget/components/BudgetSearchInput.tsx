import { Search } from 'lucide-react'

interface BudgetSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export function BudgetSearchInput({ value, onChange, placeholder }: BudgetSearchInputProps) {
  return (
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors"
      />
    </div>
  )
}
