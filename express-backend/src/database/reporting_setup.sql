-- Reporting Schema and ETL for FAAS/RPT Audit Data
-- Target: PostgreSQL / Supabase
-- Source: faas_records(id, status, data jsonb, created_at, updated_at)

--------------------------------------------------------------------------------
-- 1. Create Reporting Tables
--------------------------------------------------------------------------------

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
    v_owner_name TEXT;
    v_owner_address TEXT;
    v_muncode TEXT;
    v_bcode TEXT;
    v_barangay_code TEXT;
    v_barangay_name TEXT;
    v_tax_beg_yr TEXT;
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
        source_record_id, pin, tdn, owner_id, owner_name_snapshot, owner_address_snapshot,
        municipality_id, municipality_code, municipality_name_snapshot,
        barangay_id, barangay_code, barangay_name_snapshot,
        muncode, bcode, tax_beg_yr, trans_code, created_at, updated_at
    ) VALUES (
        v_rec.id, 
        v_rec.data->>'PIN', 
        v_rec.data->>'TDN', 
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
