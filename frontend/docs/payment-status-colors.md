# Payment Status Row Colors

The payments table uses row background colors to visually reflect each record’s current payment status.

## Status → Color Mapping

| Status (UI / Source) | Normalized Key | Row Background | Badge |
|---|---|---|---|
| `Paid`, `Completed` | `completed` | Emerald | Emerald |
| `Pending` | `pending` | Amber | Amber |
| `Failed` | `failed` | Red | Red |
| `Cancelled` | `cancelled` | Slate/Gray | Slate/Gray |
| `Unpaid` | `unpaid` | Slate/Gray (neutral) | Slate/Gray |
| anything else / empty | `unknown` | none | neutral |

## Accessibility Notes

- Colors are applied as subtle background tints to preserve text legibility.
- Dark mode uses darker tints with high-contrast foreground defaults.

## Checkbox Disabling Logic

Payment rows containing a checkbox will automatically disable the checkbox when the payment status is active or completed. This prevents duplicate actions on already-processed properties.

- **Disabled Statuses**: `paid`, `completed`, `pending`
- **Enabled Statuses**: `unpaid`, `failed`, `cancelled`, `unknown`

The disabling logic affects:
1. The individual row checkbox (visually disabled, no hover effect, sets `aria-disabled="true"`)
2. The "Select All" checkbox in the table header (only selects rows that are currently enabled)
3. The row background styling (adds an opacity layer for disabled rows)

You can check if a row should be disabled by importing the utility:
```typescript
import { isPaymentSelectionDisabled } from '@/utils/paymentStatusColors';

const disabled = isPaymentSelectionDisabled(status);
```

## Where to Change

- Mapping and normalization are centralized in: `src/utils/paymentStatusColors.ts`
- Any table row/badge should use:
  - `getPaymentRowClassName(status)`
  - `getPaymentBadgeClassName(status)`

