# Transaction Validation Requirements

This document outlines the validation-first architecture implemented for the Real Property Tax Assessment System (RPTAS) FAAS transaction processing workflow. 

## Architectural Overview

To prevent invalid database operations and provide immediate user feedback, validation has been decoupled from the persistence layer and relocated to the beginning of the transaction lifecycle. 

The validation module is implemented centrally in `transactionValidation.ts` and operates in two primary phases:

### 1. Pre-Transaction Validation (`validateTransactionStart`)
This executes the moment a user selects a transaction type (e.g., General Revision, Transfer) *before* the UI enters edit mode or instantiates a draft.
- **Status Check**: Validates that the source record is eligible for a transaction. By default, only records with an `approved` status can be revised. (Exceptions are made for `MIGRATE`).
- **Source Data Integrity**: Ensures the source record possesses essential identifiers (e.g., a TDN and PIN) required to establish a valid linkage (`pOldTdn` / `pOldPin`) for the new transaction.

### 2. Pre-Save/Pre-Submit Validation (`validateTransactionSave`)
This executes when the user attempts to persist the transaction (Save Draft or Submit for Review), but strictly *before* any network requests or database operations are initiated.
- **Required Fields**: Verifies that `TDN`, `PIN`, and `owner` are present and meet minimum length constraints.
- **Format Constraints**: Validates `TDN` and `PIN` against strictly alphanumeric-with-hyphens regex patterns (`/^[0-9-%A-Za-z]+$/`).
- **Business Rules**:
  - **TDN Mutation Rule**: For most transaction types (e.g., `GR`, `TR`), the new `TDN` **must not** be identical to the `pOldTdn`. A transaction inherently represents a new assessment, which legally necessitates a distinct Tax Declaration Number. (Exceptions are made for `REV` and `MIGRATE`).

## Reusable Functions
- `validateTransactionStart(record, type)`: Returns `ValidationResult`
- `validateTransactionSave(currentRecord)`: Returns `ValidationResult`

## Error Handling
Failed validations immediately interrupt the workflow and return a comprehensive `ValidationResult` object containing an array of specific error messages. The UI surfaces the primary error using a `toast.error()` notification, ensuring the user understands exactly which constraint was violated without experiencing a server-side 500 error.

## Testing
Comprehensive unit tests are located in `transactionValidation.test.ts`, covering:
- Null inputs
- Invalid record states
- Missing constraints
- Regex pattern violations
- Business rule logic (TDN mutation enforcement)