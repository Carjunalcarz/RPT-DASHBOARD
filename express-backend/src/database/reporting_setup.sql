-- Reporting Schema and ETL for FAAS/RPT Audit Data
-- Target: PostgreSQL / Supabase
-- Source: faas_records(id, status, data jsonb, created_at, updated_at)

--------------------------------------------------------------------------------
-- 1. Create Reporting Tables
--------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Owners table
CREATE TABLE IF NOT EXISTS public.owner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, address)
);

-- Municipalities table
CREATE TABLE IF NOT EXISTS public.municipality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barangays table
CREATE TABLE IF NOT EXISTS public.barangay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID REFERENCES public.municipality(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(municipality_id, code)
);

-- RPT Property table
CREATE TABLE IF NOT EXISTS public.rpt_property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL,
    pin TEXT,
    tdn TEXT,
    owner_id UUID REFERENCES public.owner(id) ON DELETE SET NULL,
    owner_name_snapshot TEXT,
    owner_address_snapshot TEXT,
    municipality_id UUID REFERENCES public.municipality(id) ON DELETE SET NULL,
    municipality_code TEXT,
    municipality_name_snapshot TEXT,
    barangay_id UUID REFERENCES public.barangay(id) ON DELETE SET NULL,
    barangay_code TEXT,
    barangay_name_snapshot TEXT,
    muncode TEXT,
    bcode TEXT,
    tax_beg_yr TEXT,
    trans_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_record_id)
);

-- RPT Assessment table
CREATE TABLE IF NOT EXISTS public.rpt_assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.rpt_property(id) ON DELETE CASCADE,
    kind TEXT,
    ass_level NUMERIC,
    taxability TEXT,
    classification TEXT,
    subclass TEXT,
    area NUMERIC,
    measurement TEXT,
    market_value NUMERIC,
    ass_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.property_status AS ENUM ('active','archived','split','merged');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rpt_payment_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.rpt_payment_status AS ENUM ('unpaid','pending','paid');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tdn_change_reason' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.tdn_change_reason AS ENUM ('new','general_revision','correction','split','merge','other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'owner_change_reason' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.owner_change_reason AS ENUM ('new','transfer','inheritance','correction','other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lineage_event' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.lineage_event AS ENUM ('split','merge');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.review_status AS ENUM ('queued','in_progress','resolved','dismissed');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status public.property_status NOT NULL DEFAULT 'active',
    municipality_code TEXT NOT NULL,
    barangay_code TEXT NOT NULL,
    pin TEXT,
    arp_no TEXT,
    lot_no TEXT,
    block_no TEXT,
    current_tdn_history_id UUID,
    current_owner_history_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_from_source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL,
    last_source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.property_tdn_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tdn TEXT NOT NULL,
    old_tdn TEXT,
    tax_beg_year INT,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    change_reason public.tdn_change_reason NOT NULL DEFAULT 'new',
    source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_owner_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    owner_address TEXT,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    change_reason public.owner_change_reason NOT NULL DEFAULT 'new',
    source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event public.lineage_event NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    to_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    notes TEXT,
    source_record_id TEXT REFERENCES public.faas_records(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT property_lineage_no_self_ref CHECK (from_property_id <> to_property_id)
);

CREATE TABLE IF NOT EXISTS public.manual_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id TEXT NOT NULL REFERENCES public.faas_records(id) ON DELETE CASCADE,
    status public.review_status NOT NULL DEFAULT 'queued',
    reason TEXT NOT NULL,
    confidence_score NUMERIC(5,2),
    candidate_property_ids UUID[],
    candidate_notes JSONB,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    resolved_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL
);

ALTER TABLE public.rpt_property
    ADD COLUMN IF NOT EXISTS master_property_id UUID;

ALTER TABLE public.rpt_property
    ADD COLUMN IF NOT EXISTS payment_status public.rpt_payment_status NOT NULL DEFAULT 'unpaid';

UPDATE public.rpt_property
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rpt_property_master_property_id_fkey'
    ) THEN
        ALTER TABLE public.rpt_property
            ADD CONSTRAINT rpt_property_master_property_id_fkey
            FOREIGN KEY (master_property_id)
            REFERENCES public.properties(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS property_tdn_history_one_current_per_property
    ON public.property_tdn_history(property_id)
    WHERE is_current;

CREATE UNIQUE INDEX IF NOT EXISTS property_tdn_history_unique_current_tdn
    ON public.property_tdn_history(tdn)
    WHERE is_current;

CREATE UNIQUE INDEX IF NOT EXISTS property_tdn_history_property_tdn_unique
    ON public.property_tdn_history(property_id, tdn);

CREATE UNIQUE INDEX IF NOT EXISTS property_owner_history_one_current_per_property
    ON public.property_owner_history(property_id)
    WHERE is_current;

CREATE INDEX IF NOT EXISTS properties_muni_brgy_idx
    ON public.properties(municipality_code, barangay_code);

CREATE INDEX IF NOT EXISTS properties_pin_idx
    ON public.properties(pin);

CREATE INDEX IF NOT EXISTS properties_arp_idx
    ON public.properties(arp_no);

CREATE INDEX IF NOT EXISTS properties_lot_block_idx
    ON public.properties(municipality_code, barangay_code, lot_no, block_no);

CREATE INDEX IF NOT EXISTS property_tdn_history_tdn_idx
    ON public.property_tdn_history(tdn);

CREATE INDEX IF NOT EXISTS property_tdn_history_old_tdn_idx
    ON public.property_tdn_history(old_tdn);

CREATE INDEX IF NOT EXISTS property_owner_history_owner_trgm
    ON public.property_owner_history
    USING gin ((lower(owner_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS manual_review_status_idx
    ON public.manual_review_queue(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS manual_review_one_open_per_submission
    ON public.manual_review_queue(submission_id)
    WHERE status IN ('queued','in_progress');

CREATE OR REPLACE FUNCTION public.tdn_history_enforce_current()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current THEN
        UPDATE public.property_tdn_history
        SET is_current = FALSE,
            effective_to = COALESCE(effective_to, NEW.effective_from - INTERVAL '1 day')
        WHERE property_id = NEW.property_id
          AND is_current = TRUE
          AND id <> NEW.id;

        UPDATE public.properties
        SET current_tdn_history_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.property_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tdn_history_enforce_current ON public.property_tdn_history;
CREATE TRIGGER trg_tdn_history_enforce_current
BEFORE INSERT OR UPDATE OF is_current ON public.property_tdn_history
FOR EACH ROW EXECUTE FUNCTION public.tdn_history_enforce_current();

CREATE OR REPLACE FUNCTION public.owner_history_enforce_current()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current THEN
        UPDATE public.property_owner_history
        SET is_current = FALSE,
            effective_to = COALESCE(effective_to, NEW.effective_from - INTERVAL '1 day')
        WHERE property_id = NEW.property_id
          AND is_current = TRUE
          AND id <> NEW.id;

        UPDATE public.properties
        SET current_owner_history_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.property_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_owner_history_enforce_current ON public.property_owner_history;
CREATE TRIGGER trg_owner_history_enforce_current
BEFORE INSERT OR UPDATE OF is_current ON public.property_owner_history
FOR EACH ROW EXECUTE FUNCTION public.owner_history_enforce_current();

CREATE OR REPLACE VIEW public.v_properties_current AS
SELECT
    p.id AS property_id,
    p.status,
    p.municipality_code,
    p.barangay_code,
    p.pin,
    p.arp_no,
    p.lot_no,
    p.block_no,
    t.tdn AS current_tdn,
    t.tax_beg_year AS current_tax_beg_year,
    t.effective_from AS tdn_effective_from,
    o.owner_name AS current_owner_name,
    o.owner_address AS current_owner_address,
    o.effective_from AS owner_effective_from,
    p.created_at,
    p.updated_at
FROM public.properties p
LEFT JOIN public.property_tdn_history t ON t.id = p.current_tdn_history_id
LEFT JOIN public.property_owner_history o ON o.id = p.current_owner_history_id;

--------------------------------------------------------------------------------
-- 2. ETL Logic (Incremental and Batch)
--------------------------------------------------------------------------------

-- Function to process a single record
CREATE OR REPLACE FUNCTION public.sync_faas_to_reporting(v_faas_record_id TEXT)
RETURNS void AS $$
DECLARE
    v_rec RECORD;
    v_owner_id UUID;
    v_municipality_id UUID;
    v_barangay_id UUID;
    v_property_id UUID;
    v_master_property_id UUID;
    v_owner_name TEXT;
    v_owner_address TEXT;
    v_muncode TEXT;
    v_bcode TEXT;
    v_barangay_code TEXT;
    v_barangay_name TEXT;
    v_tax_beg_yr TEXT;
    v_pin TEXT;
    v_new_tdn TEXT;
    v_old_tdn TEXT;
    v_arp_no TEXT;
    v_lot_no TEXT;
    v_block_no TEXT;
    v_candidate_count INT;
    v_owner_best_property_id UUID;
    v_owner_best_sim REAL;
    v_owner_second_sim REAL;
    v_existing_current_owner TEXT;
    v_tdn_reason public.tdn_change_reason;
    v_tax_beg_year_int INT;
    v_assessment_rec JSONB;
BEGIN
    SELECT * INTO v_rec FROM public.faas_records WHERE id = v_faas_record_id;
    
    -- If the record is NOT approved, we remove it from reporting
    IF v_rec IS NULL OR v_rec.status != 'approved' THEN
        DELETE FROM public.rpt_property WHERE source_record_id = v_faas_record_id;
        RETURN;
    END IF;

    -- Mapping logic for basic fields
    v_owner_name := COALESCE(v_rec.data->>'Owner_Name', v_rec.data->>'owner', v_rec.data->>'pOwner');
    v_owner_address := v_rec.data->>'Owner_Address';
    v_muncode := COALESCE(v_rec.data->>'cityCode', v_rec.data->>'CITY');
    v_bcode := v_rec.data->>'BCODE';
    v_barangay_code := COALESCE(v_rec.data->>'barangayCode', v_rec.data->>'BRGY.CODE');
    v_barangay_name := COALESCE(v_rec.data->>'barangay', v_rec.data->>'BARANGAY');
    v_pin := COALESCE(v_rec.data->>'PIN', v_rec.data->>'pin');
    v_new_tdn := COALESCE(v_rec.data->>'TDN', v_rec.data->>'tdn', v_rec.tdn);
    v_old_tdn := COALESCE(
        v_rec.data->>'P_OLD_TDN',
        v_rec.data->>'pOldTdn',
        v_rec.data->>'pOldTDN',
        v_rec.data->>'OLD_TDN',
        v_rec.data->>'old_tdn'
    );
    v_arp_no := COALESCE(v_rec.data->>'ARP', v_rec.data->>'arp', v_rec.data->>'ARP_NO', v_rec.data->>'arpNo');
    v_lot_no := COALESCE(v_rec.data->>'LOT_NO', v_rec.data->>'lotNo', v_rec.data->>'lot');
    v_block_no := COALESCE(v_rec.data->>'BLOCK_NO', v_rec.data->>'blockNo', v_rec.data->>'block');
    v_tax_beg_yr := NULL;
    BEGIN
        v_tax_beg_yr := NULLIF(trim(COALESCE(
            v_rec.data->>'effectivityDate',
            v_rec.data->>'EFFECTIVITY_DATE',
            v_rec.data->>'EFF_DATE',
            v_rec.data->>'pEffDate',
            v_rec.data->>'effYear',
            v_rec.data->>'EFF_YEAR'
        )), '');

        IF v_tax_beg_yr ~ '^\d{2}$' THEN
            v_tax_beg_yr := (2000 + CAST(v_tax_beg_yr AS INTEGER))::TEXT;
        ELSIF v_tax_beg_yr ~ '^01/01/\d{4}' THEN
            v_tax_beg_yr := substring(v_tax_beg_yr from 7 for 4);
        ELSE
            v_tax_beg_yr := substring(v_tax_beg_yr from 1 for 4);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tax_beg_yr := NULL;
    END;

    IF v_tax_beg_yr IS NULL OR v_tax_beg_yr = '' THEN
        v_tax_beg_yr := v_rec.data->>'TAX_BEG_YR';
    END IF;

    v_tax_beg_year_int := NULL;
    BEGIN
        IF v_tax_beg_yr IS NOT NULL AND v_tax_beg_yr ~ '^\d{4}$' THEN
            v_tax_beg_year_int := v_tax_beg_yr::INT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tax_beg_year_int := NULL;
    END;

    v_master_property_id := NULL;
    v_candidate_count := 0;

    IF v_pin IS NOT NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.pin = v_pin;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM public.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.pin = v_pin
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO public.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'Multiple properties match the submitted PIN', 60.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_old_tdn IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.property_tdn_history h
        WHERE h.tdn = v_old_tdn;

        IF v_candidate_count = 1 THEN
            SELECT h.property_id INTO v_master_property_id
            FROM public.property_tdn_history h
            WHERE h.tdn = v_old_tdn
            ORDER BY h.created_at DESC
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO public.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'Multiple properties match the submitted OLD TDN', 55.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_new_tdn IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.property_tdn_history h
        WHERE h.tdn = v_new_tdn AND h.is_current = TRUE;

        IF v_candidate_count = 1 THEN
            SELECT h.property_id INTO v_master_property_id
            FROM public.property_tdn_history h
            WHERE h.tdn = v_new_tdn AND h.is_current = TRUE
            ORDER BY h.created_at DESC
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO public.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'TDN is already current for multiple properties', 40.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL AND v_lot_no IS NOT NULL AND v_block_no IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.lot_no = v_lot_no
          AND p.block_no = v_block_no;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM public.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.lot_no = v_lot_no
              AND p.block_no = v_block_no
            LIMIT 1;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL AND v_arp_no IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.arp_no = v_arp_no;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM public.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.arp_no = v_arp_no
            LIMIT 1;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_owner_name IS NOT NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL THEN
        SELECT p.id, similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name)))::REAL
          INTO v_owner_best_property_id, v_owner_best_sim
        FROM public.properties p
        JOIN public.property_owner_history oh ON oh.id = p.current_owner_history_id
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
        ORDER BY similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name))) DESC
        LIMIT 1;

        SELECT similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name)))::REAL
          INTO v_owner_second_sim
        FROM public.properties p
        JOIN public.property_owner_history oh ON oh.id = p.current_owner_history_id
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
        ORDER BY similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name))) DESC
        OFFSET 1
        LIMIT 1;

        IF v_owner_best_sim IS NOT NULL AND v_owner_best_sim >= 0.60 AND (v_owner_second_sim IS NULL OR (v_owner_best_sim - v_owner_second_sim) >= 0.10) THEN
            v_master_property_id := v_owner_best_property_id;
        END IF;
    END IF;

    IF v_muncode IS NULL OR v_barangay_code IS NULL THEN
        INSERT INTO public.manual_review_queue (submission_id, reason, confidence_score)
        VALUES (v_faas_record_id, 'Missing municipality or barangay code; cannot resolve property identity', 10.00)
        ON CONFLICT DO NOTHING;
        RETURN;
    END IF;

    IF v_master_property_id IS NULL THEN
        INSERT INTO public.properties (
            municipality_code, barangay_code, pin, arp_no, lot_no, block_no,
            created_from_source_record_id, last_source_record_id
        ) VALUES (
            v_muncode, v_barangay_code, v_pin, v_arp_no, v_lot_no, v_block_no,
            v_faas_record_id, v_faas_record_id
        )
        RETURNING id INTO v_master_property_id;
    ELSE
        UPDATE public.properties
        SET pin = COALESCE(pin, v_pin),
            arp_no = COALESCE(arp_no, v_arp_no),
            lot_no = COALESCE(lot_no, v_lot_no),
            block_no = COALESCE(block_no, v_block_no),
            last_source_record_id = v_faas_record_id,
            updated_at = NOW()
        WHERE id = v_master_property_id;
    END IF;

    IF v_owner_name IS NOT NULL THEN
        SELECT oh.owner_name INTO v_existing_current_owner
        FROM public.properties p
        JOIN public.property_owner_history oh ON oh.id = p.current_owner_history_id
        WHERE p.id = v_master_property_id;

        IF v_existing_current_owner IS NULL OR unaccent(lower(v_existing_current_owner)) <> unaccent(lower(v_owner_name)) THEN
            INSERT INTO public.property_owner_history (
                property_id, owner_name, owner_address, is_current, effective_from, change_reason, source_record_id
            ) VALUES (
                v_master_property_id, v_owner_name, v_owner_address, TRUE, CURRENT_DATE,
                CASE
                    WHEN v_existing_current_owner IS NULL THEN 'new'::public.owner_change_reason
                    ELSE 'transfer'::public.owner_change_reason
                END,
                v_faas_record_id
            );
        END IF;
    END IF;

    IF v_new_tdn IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.property_tdn_history h WHERE h.property_id = v_master_property_id) THEN
            IF v_old_tdn IS NOT NULL AND v_old_tdn <> '' AND v_old_tdn <> v_new_tdn THEN
                v_tdn_reason := 'general_revision';
            ELSE
                v_tdn_reason := 'correction';
            END IF;
        ELSE
            v_tdn_reason := 'new';
        END IF;

        INSERT INTO public.property_tdn_history (
            property_id, tdn, old_tdn, tax_beg_year, effective_from, is_current, change_reason, source_record_id
        ) VALUES (
            v_master_property_id, v_new_tdn, v_old_tdn, v_tax_beg_year_int, CURRENT_DATE, TRUE, v_tdn_reason, v_faas_record_id
        )
        ON CONFLICT (property_id, tdn) DO UPDATE SET
            old_tdn = EXCLUDED.old_tdn,
            tax_beg_year = EXCLUDED.tax_beg_year,
            effective_to = NULL,
            is_current = TRUE,
            change_reason = EXCLUDED.change_reason,
            source_record_id = EXCLUDED.source_record_id;
    END IF;

    -- 1. Upsert Owner
    IF v_owner_name IS NOT NULL THEN
        INSERT INTO public.owner (name, address)
        VALUES (v_owner_name, v_owner_address)
        ON CONFLICT (name, address) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_owner_id;
    ELSE
        v_owner_id := NULL;
    END IF;

    -- 2. Upsert Municipality
    IF v_muncode IS NOT NULL THEN
        INSERT INTO public.municipality (code, description)
        VALUES (v_muncode, v_muncode)
        ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_municipality_id;
    ELSE
        v_municipality_id := NULL;
    END IF;

    -- 3. Upsert Barangay
    IF v_barangay_code IS NOT NULL AND v_municipality_id IS NOT NULL THEN
        INSERT INTO public.barangay (municipality_id, code, description)
        VALUES (v_municipality_id, v_barangay_code, v_barangay_name)
        ON CONFLICT (municipality_id, code) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
        RETURNING id INTO v_barangay_id;
    ELSE
        v_barangay_id := NULL;
    END IF;

    -- 4. Upsert Property
    INSERT INTO public.rpt_property (
        source_record_id, master_property_id, pin, tdn, owner_id, owner_name_snapshot, owner_address_snapshot,
        municipality_id, municipality_code, municipality_name_snapshot,
        barangay_id, barangay_code, barangay_name_snapshot,
        muncode, bcode, tax_beg_yr, trans_code, created_at, updated_at
    ) VALUES (
        v_rec.id, 
        v_master_property_id,
        v_pin, 
        v_new_tdn, 
        v_owner_id, 
        v_owner_name, 
        v_owner_address,
        v_municipality_id, 
        v_muncode, 
        v_muncode,
        v_barangay_id, 
        v_barangay_code, 
        v_barangay_name,
        v_muncode, 
        v_bcode, 
        v_tax_beg_yr, 
        v_rec.data->>'TRANS_CD',
        v_rec.created_at,
        v_rec.updated_at
    ) ON CONFLICT (source_record_id) DO UPDATE SET
        master_property_id = EXCLUDED.master_property_id,
        pin = EXCLUDED.pin,
        tdn = EXCLUDED.tdn,
        owner_id = EXCLUDED.owner_id,
        owner_name_snapshot = EXCLUDED.owner_name_snapshot,
        owner_address_snapshot = EXCLUDED.owner_address_snapshot,
        municipality_id = EXCLUDED.municipality_id,
        municipality_code = EXCLUDED.municipality_code,
        barangay_id = EXCLUDED.barangay_id,
        barangay_code = EXCLUDED.barangay_code,
        muncode = EXCLUDED.muncode,
        bcode = EXCLUDED.bcode,
        tax_beg_yr = EXCLUDED.tax_beg_yr,
        trans_code = EXCLUDED.trans_code,
        updated_at = NOW()
    RETURNING id INTO v_property_id;

    -- 5. Clear and Re-insert Assessments for this property
    DELETE FROM public.rpt_assessment WHERE property_id = v_property_id;
    
    IF v_rec.data ? 'assessments' AND jsonb_typeof(v_rec.data->'assessments') = 'array' THEN
        INSERT INTO public.rpt_assessment (
            property_id, kind, ass_level, taxability, classification, subclass, 
            area, measurement, market_value, ass_value
        )
        SELECT 
            v_property_id,
            elem->>'KIND',
            (elem->>'ASS_LEVEL')::NUMERIC,
            elem->>'TAXABILITY',
            elem->>'CLASSIFICATION',
            elem->>'SUB_CLASS',
            (elem->>'AREA')::NUMERIC,
            elem->>'UNIT',
            (elem->>'MARKET_VAL')::NUMERIC,
            (elem->>'ASS_VALUE')::NUMERIC
        FROM jsonb_array_elements(v_rec.data->'assessments') AS elem;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Batch Refresh Function
CREATE OR REPLACE FUNCTION public.refresh_reporting_data()
RETURNS void AS $$
DECLARE
    v_rec RECORD;
BEGIN
    FOR v_rec IN SELECT id FROM public.faas_records WHERE status = 'approved' LOOP
        PERFORM public.sync_faas_to_reporting(v_rec.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 3. Automation (Triggers)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sync_faas_to_reporting()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if status changed to approved or if already approved and data changed
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
       (TG_OP = 'UPDATE' AND (NEW.status = 'approved' OR OLD.status = 'approved')) THEN
        PERFORM public.sync_faas_to_reporting(NEW.id);
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.rpt_property WHERE source_record_id = OLD.id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_faas_records_reporting_sync ON public.faas_records;
CREATE TRIGGER trg_faas_records_reporting_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.faas_records
    FOR EACH ROW EXECUTE FUNCTION public.trg_sync_faas_to_reporting();


-- To run the ETL:
-- SELECT public.refresh_reporting_data();
