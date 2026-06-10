-- Applies the payors table explicitly to the public schema, because
-- payorService.js checks information_schema for public.payors and queries
-- public.payors directly (independent of DB_SCHEMA / search_path).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public."payors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "id_type" TEXT NOT NULL,
  "id_number" TEXT NOT NULL,
  "contact" JSONB NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "payors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payors_id_type_id_number_key" UNIQUE ("id_type", "id_number")
);

CREATE INDEX IF NOT EXISTS "payors_last_first_idx" ON public."payors" ("last_name", "first_name");

CREATE INDEX IF NOT EXISTS "payors_search_trgm_idx"
ON public."payors"
USING gin ((lower(first_name || ' ' || last_name || ' ' || address)) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.trg_set_payors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payors_set_updated_at ON public."payors";
CREATE TRIGGER payors_set_updated_at
  BEFORE UPDATE ON public."payors"
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_payors_updated_at();
