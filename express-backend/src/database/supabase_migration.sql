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
INSERT INTO building_types (code, name) VALUES
('RES', 'RESIDENTIAL BUILDING: ONE FAMILY DWELLING, SINGLE DETACHED, DUPLEX'),
('ACC', 'ACCESSORY: QUARTER, LAUNDRY, GUARD HOUSE, ANNEX, POWER HOUSE, RESTROOM'),
('APT', 'APARTMENT: BOARDING HOUSE, LODGING HOUSE, PENSION HOUSE, TOWN HOUSE, APARTEL, FUNERAL PARLOR, DORMITORY'),
('COM', 'COMMERCIAL: RESTAURANT, SHOPPING CENTER & MARKET'),
('THE', 'THEATERS, ASSEMBLY HOUSE, CONVENTION'),
('HOT', 'HOTEL, MOTEL, RESTAURANT, RESTO BAR, CLUB HOUSE, BANK, PHARMACY, STORE, BUILDING, PRESS'),
('IND', 'FACTORY, WAREHOUSE, BODEGA'),
('SCH', 'SCHOOL BUILDING, GOVERNMENT BUILDING, LIBRARY'),
('GYM', 'GYMNASIUM, COLISEUM')
ON CONFLICT (code) DO NOTHING;

-- 4. Insert Data from the Document (Section 22, Ordinance No. 716-2024 -> 6th GR SP ORDINACE 2025)

-- RESIDENTIAL (Row 1)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 10890.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 10350.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 7990.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 7590.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 6800.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 6460.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'C', 6140.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 5830.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 5540.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 4810.00 FROM building_types WHERE code = 'RES'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'B', 4570.00 FROM building_types WHERE code = 'RES';

-- ACCESSORY (Row 2)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 7680.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 7280.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 6380.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 5460.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 4010.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 3820.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'C', 3430.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 3340.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 3150.00 FROM building_types WHERE code = 'ACC'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 2880.00 FROM building_types WHERE code = 'ACC';

-- APARTMENT (Row 3)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 8450.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 7800.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 5980.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 5070.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 4200.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 3920.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'C', 3820.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 3540.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 3350.00 FROM building_types WHERE code = 'APT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 3080.00 FROM building_types WHERE code = 'APT';

-- COMMERCIAL (Restaurant/Shopping) (Row 8 in first image, Row 4 in table logic)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 7230.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 6720.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 6100.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 5200.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 4810.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 4290.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 4040.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 3820.00 FROM building_types WHERE code = 'COM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 3510.00 FROM building_types WHERE code = 'COM';

-- SCHOOL (Row 5)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 8710.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 7700.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 7470.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 6380.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 6190.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 5460.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 4850.00 FROM building_types WHERE code = 'SCH'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 4540.00 FROM building_types WHERE code = 'SCH';

-- HOTEL/MOTEL (Row 6)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 10000.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 9200.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 8920.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 7840.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 6900.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 5660.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 5120.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 4970.00 FROM building_types WHERE code = 'HOT'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 4470.00 FROM building_types WHERE code = 'HOT';

-- THEATERS (Row 7)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 10430.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 10220.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 9910.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 9480.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 8450.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 7020.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 5460.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 5300.00 FROM building_types WHERE code = 'THE'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 4850.00 FROM building_types WHERE code = 'THE';

-- FACTORY/WAREHOUSE (Row 9)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 7500.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 5430.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 5270.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 4290.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 3840.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 3020.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 2830.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 2750.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 2730.00 FROM building_types WHERE code = 'IND'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'B', 2630.00 FROM building_types WHERE code = 'IND';

-- GYMNASIUM (Row 10)
INSERT INTO building_market_values (ordinance_no, effectivity_date, building_type_id, structure_class, sub_class, unit_value)
SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'A', 9130.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'V', 'B', 8320.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'A', 8070.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'IV', 'B', 6970.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'A', 5770.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'III', 'B', 5120.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'A', 4290.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'II', 'B', 4160.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'A', 3210.00 FROM building_types WHERE code = 'GYM'
UNION ALL SELECT '6th GR SP 2025', '2025-01-01'::DATE, id, 'I', 'B', 2910.00 FROM building_types WHERE code = 'GYM';