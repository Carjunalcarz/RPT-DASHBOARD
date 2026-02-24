# Real Property Data Entry Checklist

## 1. Prerequisites
- [ ] Database connection string points to `RPTAS_AGUSAN`.
- [ ] MSSQL tables (`RPTMAST`, `rptOWNER`, `RPT_ASS`, `CITY`, `BARANGAY`) exist.
- [ ] `RPT_AUDIT_LOG` table created.

## 2. Backend Implementation
- [ ] `RptDataEntryService` implements `getReferences`, `getRecord`, `saveRecord` using the provided SQL schema.
- [ ] `RptDataEntryController` handles requests and responses correctly.
- [ ] `RptDataEntryRoutes` are defined and protected.
- [ ] Transaction management (BEGIN TRAN, COMMIT, ROLLBACK) works.
- [ ] Audit logging captures changes.

## 3. Frontend Implementation
- [ ] `RptDataEntryForm` component created.
- [ ] Form fields mapped to DB columns (`TDN`, `PIN`, `Name`, `KIND`, etc.) correctly.
- [ ] Validation logic (required fields, PIN format, numeric constraints) implemented.
- [ ] Real-time calculations (Area, Assessed Value) work correctly.
- [ ] API calls (load references, load record, save record) are successful.

## 4. Testing & Validation
- [ ] Unit tests for frontend calculations pass.
- [ ] Integration tests for backend API endpoints pass.
- [ ] Manual testing of CRUD operations successful.
- [ ] Role-based access control verified.
