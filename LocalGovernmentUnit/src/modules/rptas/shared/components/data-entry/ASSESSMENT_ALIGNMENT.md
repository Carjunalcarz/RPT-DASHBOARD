# Assessment Alignment (data-entry ↔ RPT-management)

## Goal
Make the assessment feature under `shared/components/data-entry/` behave consistently with the assessment logic used by `domains/RPT-management/`, while keeping existing UI flows and record shapes stable.

## Inventory
### data-entry (shared)
- `faas/AssessmentSection.tsx` (assessment type switching + wiring to Land/Building/Machinery)
- `land/LandAssessment.tsx`
- `building/BuildingAssessment.tsx`
- `machinery/MachineryAssessment.tsx`
- `AssessmentTable.tsx`, `TableToolbar.tsx` (standalone assessment table UI)

### RPT-management (domains)
- `faas/rpt_m_AssessmentSection.tsx` (type switching, trees attachment, merge-update strategy)
- `land/rpt_m_LandAssessment.tsx` (ordinance usage + cached fetching via React Query)
- `queries/actualUseOrdinancesQuery.ts` (prefetch/cache of ordinances)

## Key Differences (Before)
- `data-entry/faas/AssessmentSection.tsx` normalized mixed record shapes but only merged updates reliably for Land; Building/Machinery edits did not propagate back to parent `onUpdate`.
- `RPT-management/faas/rpt_m_AssessmentSection.tsx` merged updates by replacing only the edited type and preserving other types, and also attached `trees` by `TDN`.
- Ordinance prefetching existed only in RPT-management.

## Changes Implemented
### 1) Align AssessmentSection merge strategy and trees attachment
- `data-entry/faas/AssessmentSection.tsx`
  - Uses the RPT-management merge strategy: when a type updates, it replaces only that type and preserves other types.
  - Attaches `trees` to land records (matching by `TDN`) before passing to `LandAssessment`.
  - Triggers ordinance prefetch on mount by calling the same query prefetch hook used by RPT-management.

### 2) Add upward propagation hooks for Building/Machinery
- `data-entry/building/BuildingAssessment.tsx`
- `data-entry/machinery/MachineryAssessment.tsx`
  - Added optional `onUpdate` prop.
  - Emits normalized `RptAssRecord[]` when local records change (skipping the first hydration update) so parent autosave/merge behavior matches RPT-management.

## Data Integrity Notes
- Record identity is preserved using the existing `TDN`/`id` mapping already present in the components.
- Normalization keeps `KIND` consistent (`L|B|M`) to prevent mixed-string issues (`Land`, `Building`, etc.).
- Initial hydration from API props does not immediately trigger `onUpdate` to avoid overwriting upstream state.

## Tests Added
- `faas/AssessmentSection.test.tsx`
  - Asserts auto-tab selection by first record kind
  - Asserts trees are attached to land records before rendering
  - Asserts merge behavior preserves other record types when land updates occur

