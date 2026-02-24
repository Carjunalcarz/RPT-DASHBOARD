# Real Property Data Entry Implementation Tasks

## Phase 1: Database Setup
- [ ] Create `RPT_AUDIT_LOG` table migration script.
- [ ] Verify existence of `RPTAS_AGUSAN.dbo` tables: `RPTMAST`, `rptOWNER`, `RPT_ASS`, `CITY`, `BARANGAY`.

## Phase 2: Backend Implementation
- [ ] Create `RptDataEntryService` (src/services/rptDataEntryService.js)
  - [ ] Implement `getReferences`: Fetch CITY, BARANGAY, KIND, CLASSIFICATION, SUB_CLASS.
  - [ ] Implement `getRecord`: Execute the provided SQL JOIN query by TDN.
  - [ ] Implement `saveRecord`: Transactional MERGE into `RPTMAST`, `rptOWNER`, `RPT_ASS`.
- [ ] Create `RptDataEntryController` (src/controllers/rptDataEntryController.js)
  - [ ] Validate request body against schema.
  - [ ] Handle success/error responses.
- [ ] Create `RptDataEntryRoutes` (src/routes/rptDataEntryRoutes.js)
  - [ ] Define routes: `/api/v1/rpt-entry/references`, `/api/v1/rpt-entry/:tdn`, `/api/v1/rpt-entry`.
  - [ ] Apply `authMiddleware` and `roleMiddleware`.

## Phase 3: Frontend Implementation
- [ ] Create `RptDataEntryForm` component (frontend/src/components/data-entry/faas/RptDataEntryForm.tsx).
  - [ ] Define state variables for form fields (TDN, PIN, Owner, etc.).
  - [ ] Implement `useEffect` for real-time calculations (Area, Assessed Value).
  - [ ] Implement Zod validation schema.
  - [ ] Implement API calls (load references, load record, save record).
- [ ] Integrate `RptDataEntryForm` into `RealPropertyDataEntry.tsx` or create a new page.

## Phase 4: Testing & Validation
- [ ] Write unit tests for frontend calculations (area conversion, assessed value).
- [ ] Write integration tests for backend API endpoints.
- [ ] Verify audit logging on save.
- [ ] Verify role-based access control.
