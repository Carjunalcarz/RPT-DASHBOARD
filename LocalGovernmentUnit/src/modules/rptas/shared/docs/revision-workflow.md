# Property Assessment Revision Workflow

## Revision Type Detection

- Standard revision is identified by `TRANS_CD = REV`.
- MSSQL-sourced fields are treated as locked when `dataSource = mssql`.

## Field Editability Rules (Standard Revision)

- Editable:
  - Unit Value
  - Assessment Level (Tax Rate)
- Read-only:
  - Main Class
  - Actual Use
- Locked by default:
  - Municipality
  - Class Level
  - Ordinance

## Error Input Unlocking

The UI detects a revision input error when any of the following is true:

- Ordinance context is incomplete (missing Municipality/Class Level/Ordinance), or
- Main Class is not valid under the selected Municipality/Class Level/Ordinance setup, or
- Actual Use is not valid under the selected Municipality/Class Level/Ordinance setup.

When an error is detected, these fields become temporarily editable:

- Municipality
- Class Level
- Ordinance

Main Class and Actual Use remain read-only for MSSQL-sourced revisions.

## User Interface Indicators

- A banner appears in the assessment form:
  - Normal revision: indicates only Unit Value + Assessment Level are editable.
  - Error revision: indicates Municipality/Class Level/Ordinance are temporarily editable to fix context.

## Audit Trail

- For standard revisions (`TRANS_CD = REV`), server-side validation enforces that only `UNIT_VALUE`, `ASS_LEVEL`, and `TAXABLE_RATE` can change relative to the MSSQL baseline for `pOldTdn`.
- Allowed changes are recorded in the FAAS audit log details.

