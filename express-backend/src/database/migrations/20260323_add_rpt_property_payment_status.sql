DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rpt_payment_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.rpt_payment_status AS ENUM ('unpaid','pending','paid');
  END IF;
END
$$;

ALTER TABLE public.rpt_property
  ADD COLUMN IF NOT EXISTS payment_status public.rpt_payment_status NOT NULL DEFAULT 'unpaid';

UPDATE public.rpt_property
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

