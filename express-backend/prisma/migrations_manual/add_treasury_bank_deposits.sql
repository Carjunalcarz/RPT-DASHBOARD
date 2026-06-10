-- Bank Deposits feature: track collected payments as Cash on Treasury -> Cash in Bank.
-- Collections (rows in treasury_payment_exports) start as 'on_treasury' and flip to
-- 'on_bank' once batched into a deposit slip (treasury_bank_deposits).
-- The __DB_SCHEMA__ placeholder is replaced at run time by run_add_treasury_bank_deposits.js.

BEGIN;

-- Deposit slip header (one slip groups many paid orders)
CREATE TABLE IF NOT EXISTS __DB_SCHEMA__.treasury_bank_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_number TEXT NOT NULL UNIQUE,
    deposit_date DATE NOT NULL,
    reference_no TEXT,
    remarks TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_count INT NOT NULL DEFAULT 0,
    deposited_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbd_deposit_date
    ON __DB_SCHEMA__.treasury_bank_deposits(deposit_date);

-- Per-payment deposit state on the export rows
ALTER TABLE __DB_SCHEMA__.treasury_payment_exports
    ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'on_treasury',
    ADD COLUMN IF NOT EXISTS deposit_id UUID,
    ADD COLUMN IF NOT EXISTS deposited_at TIMESTAMP WITH TIME ZONE;

-- Link export rows to their deposit slip (re-run safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'treasury_payment_exports_deposit_id_fkey'
      AND table_schema = '__DB_SCHEMA__'
  ) THEN
    ALTER TABLE __DB_SCHEMA__.treasury_payment_exports
      ADD CONSTRAINT treasury_payment_exports_deposit_id_fkey
      FOREIGN KEY (deposit_id)
      REFERENCES __DB_SCHEMA__.treasury_bank_deposits(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tpe_deposit_status
    ON __DB_SCHEMA__.treasury_payment_exports(deposit_status);
CREATE INDEX IF NOT EXISTS idx_tpe_deposit_id
    ON __DB_SCHEMA__.treasury_payment_exports(deposit_id);

COMMIT;
