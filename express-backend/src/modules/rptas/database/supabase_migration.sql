-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create building_types FIRST (referenced by other tables)
CREATE TABLE IF NOT EXISTS building_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'RES', 'COM', 'ACC'
    name TEXT NOT NULL, -- e.g., 'RESIDENTIAL BUILDING', 'ACCESSORY'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create building_market_values (references building_types)
CREATE TABLE IF NOT EXISTS building_market_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordinance_no TEXT NOT NULL,
    ordinance_date DATE,
    effectivity_date DATE NOT NULL,
    building_type_id UUID REFERENCES building_types(id),
    structure_class TEXT NOT NULL, -- e.g., 'I', 'II', 'III', 'IV', 'V'
    sub_class TEXT, -- e.g., 'A', 'B', 'C'
    unit_value NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert initial building types
-- Note: Using ON CONFLICT to update names if they exist, or insert if new.
INSERT INTO building_types (id, code, name) VALUES
(uuid_generate_v4(), 'RES', 'RESIDENTIAL BUILDING: ONE FAMILY DWELLING, SINGLE DETACHED, DUPLEX'),
(uuid_generate_v4(), 'ACC', 'ACCESSORIA: QUARTER, LAUNDRY, GUARD HOUSE, ANNEX, KITCHEN, POWER HOUSE, RESTROOM'),
(uuid_generate_v4(), 'APT', 'APARTMENT: BOARDING HOUSE, LODGING HOUSE, PENSION HOUSE, TOWN HOUSE, APARTEL, FUNERAL PARLOR, DORMITORY'),
(uuid_generate_v4(), 'GAR', 'GARAGE, QUARTER, LAUNDRY & GUARDHOUSE'),
(uuid_generate_v4(), 'SCH', 'SCHOOL BUILDING, GOVERNMENT BUILDING, LIBRARY'),
(uuid_generate_v4(), 'COM', 'COMMERCIAL: RESTAURANT, SHOPPING CENTER & MARKET'),
(uuid_generate_v4(), 'THE', 'THEATERS, ASSEMBLY HOUSE, CONVENTION HALL, PAVILLON, TERMINAL: WHARF/BUS/ AND JEEPNEY'),
(uuid_generate_v4(), 'HOT', 'HOTEL, MOTEL, RESTAURANT, RESTO BAR, CLUB HOUSE, BANK, PHARMACY, STORE BUILDING, STORE AND PRINTING PRESS'),
(uuid_generate_v4(), 'IND', 'FACTORY, WAREHOUSE, BODEGA'),
(uuid_generate_v4(), 'GYM', 'GYMNASIUM, COLISEUM')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 4. Clean up existing data for this ordinance to ensure updates are applied
DELETE FROM building_market_values WHERE ordinance_no = '6th GR SP 2025';

-- 5. Insert Data from the Document (Section 22, Ordinance No. 716-2024 -> 6th GR SP ORDINACE 2025)

-- RESIDENTIAL (Column 1)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 10890.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 10350.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 9830.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 7990.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 7590.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 6800.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 6460.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 6140.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'D', 5830.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'E', 5540.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 4810.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 4570.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'I', 'A', 1880.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'RES') bt;

-- ACCESSORIA (Column 2)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 7680.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 7280.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 7060.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 6380.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 5460.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 4650.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 4260.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 4130.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'D', 4010.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'E', 3890.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3820.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 3430.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'ACC') bt;

-- APARTMENT (Column 3)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 8450.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 7800.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 7570.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 5980.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 5070.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 4810.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 4290.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 4160.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'D', 4040.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'E', 3920.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3820.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 3510.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'APT') bt;

-- GARAGE (Column 4)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 6720.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 6380.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 6190.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 5460.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 4850.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 4110.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 3510.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 3400.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'D', 3300.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'E', 3200.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3080.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 2800.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'GAR') bt;

-- SCHOOL (Column 5)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 8710.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 7700.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 7470.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 5170.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 4540.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 3930.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 3640.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 3530.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'D', 3420.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'E', 3320.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3300.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 2690.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'SCH') bt;

-- HOTEL/MOTEL (Column 6)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 10000.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 9200.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 8920.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 7840.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 6900.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 5660.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 5120.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 4970.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 4770.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 4360.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'HOT') bt;

-- THEATERS (Column 7)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 10430.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 10220.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 9910.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 9480.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 8450.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 7020.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 5460.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 5300.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 4850.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 4430.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'THE') bt;

-- COMMERCIAL (Column 8)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 7230.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 6720.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 6520.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 5880.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 5040.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 4240.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 3930.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 3810.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3210.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 2990.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'COM') bt;

-- FACTORY (Column 9)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 6750.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 5430.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 5270.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 4290.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 3840.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 3020.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 2830.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 2750.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 2730.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 2630.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'IND') bt;

-- GYMNASIUM (Column 10)
INSERT INTO building_market_values (id, ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value, updated_at)
SELECT uuid_generate_v4(), m.ordinance_no, m.effectivity_date, bt.id, m.structure_class, m.sub_class, m.unit_value, NOW()
FROM (VALUES
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'A', 9130.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'B', 8320.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'V', 'C', 8070.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'A', 6970.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'IV', 'B', 5770.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'A', 5120.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'B', 4290.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'III', 'C', 4160.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'A', 3210.00),
    ('6th GR SP 2025', '2025-01-01'::DATE, 'II', 'B', 2910.00)
) AS m(ordinance_no, effectivity_date, structure_class, sub_class, unit_value)
CROSS JOIN (SELECT id FROM building_types WHERE code = 'GYM') bt;

-- 11. Create building_appraisals table (Denormalized for easier access)
CREATE TABLE IF NOT EXISTS building_appraisals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classification TEXT NOT NULL, -- Full name from building_types
    classification_code TEXT NOT NULL, -- Code from building_types (e.g. RES, COM)
    building_type TEXT NOT NULL, -- Structure Class (e.g. 'I', 'II', 'III')
    building_subclass TEXT,      -- Sub Class (e.g. 'A', 'B')
    rate NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Clear existing data to prevent duplicates during re-seeding
DELETE FROM building_appraisals;

-- 13. Populate building_appraisals from building_market_values
INSERT INTO building_appraisals (id, classification, classification_code, building_type, building_subclass, rate)
SELECT 
    uuid_generate_v4(),
    bt.name,
    bt.code,
    bmv.structure_class,
    bmv.sub_class,
    bmv.unit_value
FROM building_market_values bmv
JOIN building_types bt ON bmv.building_type_id = bt.id
WHERE bmv.ordinance_no = '6th GR SP 2025';

