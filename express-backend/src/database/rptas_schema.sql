-- RPTAS Schema Setup
-- Creates the RPTAS schema and sets it as default

-- Create the RPTAS schema if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'rptas') THEN
        CREATE SCHEMA rptas;
        RAISE NOTICE 'Schema rptas created successfully';
    ELSE
        RAISE NOTICE 'Schema rptas already exists';
    END IF;
END
$$;

-- Set RPTAS as the default schema for the current session
ALTER DATABASE postgres SET search_path TO rptas, public;

-- Note: To apply this to your Supabase connection, you may need to run:
-- ALTER DATABASE <your_database_name> SET search_path TO rptas, public;

-- Grant usage on the schema to public
GRANT USAGE ON SCHEMA rptas TO public;

-- Create a function to easily switch to RPTAS schema
CREATE OR REPLACE FUNCTION set_rptas_schema()
RETURNS void AS $$
BEGIN
    SET search_path TO rptas, public;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_rptas_schema() TO public;

-- To use this schema in your application, you can:
-- 1. Add "search_path=rptas, public" to your connection string
-- 2. Or call set_rptas_schema() after connecting
-- 3. Or prefix tables with rptas. (e.g., SELECT * FROM rptas.users)