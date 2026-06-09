-- =====================================================================
-- Consolidate RPTAS transaction data into schema "rptas"
-- Run ONCE in the Supabase SQL Editor. Wrapped in a single transaction —
-- if anything fails, NOTHING is applied.
--
-- REVERSAL: move each table back with
--   ALTER TABLE rptas.<t> SET SCHEMA public;
-- and restore the 5 functions from your pre-migration backup.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS rptas;

-- 1) Drop the empty orphan rptas copies (verified 0 rows) so the populated
--    public.* tables can take their place. Aborts if any is unexpectedly
--    non-empty.
DO $mig$
DECLARE d text; n bigint;
BEGIN
  FOREACH d IN ARRAY ARRAY['barangay','municipality','owner'] LOOP
    IF to_regclass('rptas.'||quote_ident(d)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM rptas.%I', d) INTO n;
      IF n = 0 THEN
        EXECUTE format('DROP TABLE rptas.%I CASCADE', d);
        RAISE NOTICE 'dropped empty orphan rptas.%', d;
      ELSE
        RAISE EXCEPTION 'rptas.% has % rows - not an empty orphan; aborting', d, n;
      END IF;
    END IF;
  END LOOP;
END $mig$;

-- 2) Move transaction/data tables public -> rptas (idempotent: skips any
--    table already moved or absent). Triggers, FKs, indexes move with them.
DO $mig$
DECLARE t text; tbls text[] := ARRAY['faas_records', 'properties', 'property_lineage', 'property_owner_history', 'property_tdn_history', 'rpt_property', 'rpt_assessment', 'orders_of_payment', 'oop_history', 'payors', 'owner', 'barangay', 'municipality', 'municipalities', 'building_appraisals', 'building_market_values', 'building_types', 'land_agricultural', 'land_classifications', 'land_market_values', 'land_sub_classes', 'simple_land_market_values', 'setup_signatories', 'setup_signatory_templates', 'treasury_payment_exports', 'manual_review_queue', 'migration_logs', 'sidebar_items', 'sidebar_item_user_visibility'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.'||quote_ident(t)) IS NOT NULL
       AND to_regclass('rptas.'||quote_ident(t)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA rptas', t);
      RAISE NOTICE 'moved %', t;
    END IF;
  END LOOP;
END $mig$;

-- 3) Move the dependent view too.
DO $mig$
BEGIN
  IF to_regclass('public.v_properties_current') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_properties_current SET SCHEMA rptas';
    RAISE NOTICE 'moved view v_properties_current';
  END IF;
END $mig$;

-- 4) Rewrite the 5 functions: moved-table references repointed public.* -> rptas.*
--    (function/type references deliberately left in public).
-- ----- owner_history_enforce_current -----
CREATE OR REPLACE FUNCTION public.owner_history_enforce_current()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.is_current THEN
        UPDATE rptas.property_owner_history
        SET is_current = FALSE,
            effective_to = COALESCE(effective_to, NEW.effective_from - INTERVAL '1 day')
        WHERE property_id = NEW.property_id
          AND is_current = TRUE
          AND id <> NEW.id;

        UPDATE rptas.properties
        SET current_owner_history_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.property_id;
    END IF;

    RETURN NEW;
END;
$function$
;

-- ----- tdn_history_enforce_current -----
CREATE OR REPLACE FUNCTION public.tdn_history_enforce_current()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.is_current THEN
        UPDATE rptas.property_tdn_history
        SET is_current = FALSE,
            effective_to = COALESCE(effective_to, NEW.effective_from - INTERVAL '1 day')
        WHERE property_id = NEW.property_id
          AND is_current = TRUE
          AND id <> NEW.id;

        UPDATE rptas.properties
        SET current_tdn_history_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.property_id;
    END IF;

    RETURN NEW;
END;
$function$
;

-- ----- trg_sync_faas_to_reporting -----
CREATE OR REPLACE FUNCTION public.trg_sync_faas_to_reporting()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only sync if status changed to approved or if already approved and data changed
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
       (TG_OP = 'UPDATE' AND (NEW.status = 'approved' OR OLD.status = 'approved')) THEN
        PERFORM public.sync_faas_to_reporting(NEW.id);
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        DELETE FROM rptas.rpt_property WHERE source_record_id = OLD.id;
    END IF;
    
    RETURN NULL;
END;
$function$
;

-- ----- sync_faas_to_reporting -----
CREATE OR REPLACE FUNCTION public.sync_faas_to_reporting(v_faas_record_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
    SELECT * INTO v_rec FROM rptas.faas_records WHERE id = v_faas_record_id;
    
    -- If the record is NOT approved, we remove it from reporting
    IF v_rec IS NULL OR v_rec.status != 'approved' THEN
        DELETE FROM rptas.rpt_property WHERE source_record_id = v_faas_record_id;
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
        FROM rptas.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.pin = v_pin;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM rptas.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.pin = v_pin
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO rptas.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'Multiple properties match the submitted PIN', 60.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_old_tdn IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM rptas.property_tdn_history h
        WHERE h.tdn = v_old_tdn;

        IF v_candidate_count = 1 THEN
            SELECT h.property_id INTO v_master_property_id
            FROM rptas.property_tdn_history h
            WHERE h.tdn = v_old_tdn
            ORDER BY h.created_at DESC
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO rptas.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'Multiple properties match the submitted OLD TDN', 55.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_new_tdn IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM rptas.property_tdn_history h
        WHERE h.tdn = v_new_tdn AND h.is_current = TRUE;

        IF v_candidate_count = 1 THEN
            SELECT h.property_id INTO v_master_property_id
            FROM rptas.property_tdn_history h
            WHERE h.tdn = v_new_tdn AND h.is_current = TRUE
            ORDER BY h.created_at DESC
            LIMIT 1;
        ELSIF v_candidate_count > 1 THEN
            INSERT INTO rptas.manual_review_queue (submission_id, reason, confidence_score)
            VALUES (v_faas_record_id, 'TDN is already current for multiple properties', 40.00)
            ON CONFLICT DO NOTHING;
            RETURN;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL AND v_lot_no IS NOT NULL AND v_block_no IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM rptas.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.lot_no = v_lot_no
          AND p.block_no = v_block_no;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM rptas.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.lot_no = v_lot_no
              AND p.block_no = v_block_no
            LIMIT 1;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL AND v_arp_no IS NOT NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM rptas.properties p
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
          AND p.arp_no = v_arp_no;

        IF v_candidate_count = 1 THEN
            SELECT p.id INTO v_master_property_id
            FROM rptas.properties p
            WHERE p.municipality_code = v_muncode
              AND p.barangay_code = v_barangay_code
              AND p.arp_no = v_arp_no
            LIMIT 1;
        END IF;
    END IF;

    IF v_master_property_id IS NULL AND v_owner_name IS NOT NULL AND v_muncode IS NOT NULL AND v_barangay_code IS NOT NULL THEN
        SELECT p.id, similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name)))::REAL
          INTO v_owner_best_property_id, v_owner_best_sim
        FROM rptas.properties p
        JOIN rptas.property_owner_history oh ON oh.id = p.current_owner_history_id
        WHERE p.municipality_code = v_muncode
          AND p.barangay_code = v_barangay_code
        ORDER BY similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name))) DESC
        LIMIT 1;

        SELECT similarity(unaccent(lower(oh.owner_name)), unaccent(lower(v_owner_name)))::REAL
          INTO v_owner_second_sim
        FROM rptas.properties p
        JOIN rptas.property_owner_history oh ON oh.id = p.current_owner_history_id
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
        INSERT INTO rptas.manual_review_queue (submission_id, reason, confidence_score)
        VALUES (v_faas_record_id, 'Missing municipality or barangay code; cannot resolve property identity', 10.00)
        ON CONFLICT DO NOTHING;
        RETURN;
    END IF;

    IF v_master_property_id IS NULL THEN
        INSERT INTO rptas.properties (
            municipality_code, barangay_code, pin, arp_no, lot_no, block_no,
            created_from_source_record_id, last_source_record_id
        ) VALUES (
            v_muncode, v_barangay_code, v_pin, v_arp_no, v_lot_no, v_block_no,
            v_faas_record_id, v_faas_record_id
        )
        RETURNING id INTO v_master_property_id;
    ELSE
        UPDATE rptas.properties
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
        FROM rptas.properties p
        JOIN rptas.property_owner_history oh ON oh.id = p.current_owner_history_id
        WHERE p.id = v_master_property_id;

        IF v_existing_current_owner IS NULL OR unaccent(lower(v_existing_current_owner)) <> unaccent(lower(v_owner_name)) THEN
            INSERT INTO rptas.property_owner_history (
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
        IF EXISTS (SELECT 1 FROM rptas.property_tdn_history h WHERE h.property_id = v_master_property_id) THEN
            IF v_old_tdn IS NOT NULL AND v_old_tdn <> '' AND v_old_tdn <> v_new_tdn THEN
                v_tdn_reason := 'general_revision';
            ELSE
                v_tdn_reason := 'correction';
            END IF;
        ELSE
            v_tdn_reason := 'new';
        END IF;

        INSERT INTO rptas.property_tdn_history (
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
        INSERT INTO rptas.owner (name, address)
        VALUES (v_owner_name, v_owner_address)
        ON CONFLICT (name, address) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_owner_id;
    ELSE
        v_owner_id := NULL;
    END IF;

    -- 2. Upsert Municipality
    IF v_muncode IS NOT NULL THEN
        INSERT INTO rptas.municipality (code, description)
        VALUES (v_muncode, v_muncode)
        ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_municipality_id;
    ELSE
        v_municipality_id := NULL;
    END IF;

    -- 3. Upsert Barangay
    IF v_barangay_code IS NOT NULL AND v_municipality_id IS NOT NULL THEN
        INSERT INTO rptas.barangay (municipality_id, code, description)
        VALUES (v_municipality_id, v_barangay_code, v_barangay_name)
        ON CONFLICT (municipality_id, code) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
        RETURNING id INTO v_barangay_id;
    ELSE
        v_barangay_id := NULL;
    END IF;

    -- 4. Upsert Property
    INSERT INTO rptas.rpt_property (
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
    DELETE FROM rptas.rpt_assessment WHERE property_id = v_property_id;
    
    IF v_rec.data ? 'assessments' AND jsonb_typeof(v_rec.data->'assessments') = 'array' THEN
        INSERT INTO rptas.rpt_assessment (
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
$function$
;

-- ----- refresh_reporting_data -----
CREATE OR REPLACE FUNCTION public.refresh_reporting_data()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rec RECORD;
BEGIN
    FOR v_rec IN SELECT id FROM rptas.faas_records WHERE status = 'approved' LOOP
        PERFORM public.sync_faas_to_reporting(v_rec.id);
    END LOOP;
END;
$function$
;

COMMIT;
