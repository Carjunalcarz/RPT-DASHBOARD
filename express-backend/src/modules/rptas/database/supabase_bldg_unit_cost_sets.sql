CREATE SCHEMA IF NOT EXISTS rptas;

CREATE TABLE IF NOT EXISTS rptas.bldg_unit_cost_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinance_no TEXT NOT NULL,
  ordinance_date DATE,
  ordinance_text TEXT NOT NULL,
  city TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS bldg_unit_cost_sets_city_ordinance_no_uq
  ON rptas.bldg_unit_cost_sets (city, ordinance_no);

CREATE TABLE IF NOT EXISTS rptas.bldg_unit_cost_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES rptas.bldg_unit_cost_sets(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  struc_type TEXT NOT NULL,
  bldg_code TEXT NOT NULL,
  bldg_code_desc TEXT,
  unit_value NUMERIC(12,2) NOT NULL,
  eff_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE IF EXISTS rptas.bldg_unit_cost_sets
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS rptas.bldg_unit_cost_set_items
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bldg_unit_cost_set_items_set_id_idx
  ON rptas.bldg_unit_cost_set_items (set_id);

CREATE UNIQUE INDEX IF NOT EXISTS bldg_unit_cost_set_items_set_unique_uq
  ON rptas.bldg_unit_cost_set_items (set_id, city, struc_type, bldg_code, eff_date, unit_value);
