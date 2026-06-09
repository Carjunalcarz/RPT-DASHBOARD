-- =============================================================================
-- System Administration / RBAC schema
-- =============================================================================
-- The schema name is parameterised: every reference uses the literal token
-- __SCHEMA__ which the loader substitutes before execution. Default: public.
--
-- Idempotent + resilient: every operation that could fail because of pre-
-- existing state (ownership, column type mismatch, duplicate constraint, …)
-- is wrapped in DO ... EXCEPTION so the migration never aborts the boot. The
-- SystemAdminSetup page surfaces any partial state (missing FKs, type
-- mismatches) and offers a "Reset & Reinitialize" action for recovery.
--
-- IMPORTANT design choice: tables are created WITHOUT inline foreign-key
-- constraints. FKs are added in a separate block that catches datatype
-- mismatches. This means a brownfield database with legacy column types
-- (e.g. roles.id as text) won't crash the migration; the tables still get
-- created, the FK is skipped with a NOTICE, and the UI flags the problem.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Ensure the target schema exists.
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "__SCHEMA__";

-- ----------------------------------------------------------------------------
-- TABLES (columns + uniqueness only — no FKs)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "__SCHEMA__".pending_users (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ       DEFAULT now(),
  email        CHARACTER VARYING UNIQUE,
  username     CHARACTER VARYING,
  is_confirmed BOOLEAN           DEFAULT false
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  role_code  TEXT,
  role_name  TEXT
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  module_name TEXT,
  route_path  TEXT,
  icons       TEXT,
  is_active   BOOLEAN     DEFAULT true,
  file_path   TEXT,
  category    TEXT
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".facilities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  facility_name TEXT,
  is_active     BOOLEAN     DEFAULT true
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id    UUID,
  role_id    UUID,
  CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".role_permissions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  role_id    UUID,
  module_id  UUID,
  can_select BOOLEAN     DEFAULT false,
  can_insert BOOLEAN     DEFAULT false,
  can_update BOOLEAN     DEFAULT false,
  can_delete BOOLEAN     DEFAULT false,
  CONSTRAINT unique_role_module UNIQUE (role_id, module_id)
);

CREATE TABLE IF NOT EXISTS "__SCHEMA__".user_facilities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  user_id       UUID,
  facilities_id UUID
);

-- ----------------------------------------------------------------------------
-- FOREIGN KEYS — added separately, skipped per-FK on type mismatch / duplicate
-- / ownership errors. The UI's type-issue probe catches the same conditions.
-- ----------------------------------------------------------------------------

DO $sysadmin$
DECLARE
  spec RECORD;
  ddl  TEXT;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      -- (table,            constraint_name,                    column,         references)
      ('user_roles',        'user_roles_user_id_fkey',          'user_id',      'auth.users(id)'),
      ('user_roles',        'user_roles_role_id_fkey',          'role_id',      '"__SCHEMA__".roles(id)'),
      ('role_permissions',  'role_permissions_role_id_fkey',    'role_id',      '"__SCHEMA__".roles(id)'),
      ('role_permissions',  'role_permissions_module_id_fkey',  'module_id',    '"__SCHEMA__".modules(id)'),
      ('user_facilities',   'user_facilities_user_id_fkey',     'user_id',      'auth.users(id)'),
      ('user_facilities',   'user_facilities_facilities_id_fkey','facilities_id','"__SCHEMA__".facilities(id)')
    ) AS t(tbl, conname, col, ref)
  LOOP
    -- Skip if the constraint already exists (CREATE TABLE may have set it).
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class    r ON r.oid = c.conrelid
       WHERE n.nspname = '__SCHEMA__'
         AND r.relname = spec.tbl
         AND c.conname = spec.conname
    ) THEN
      CONTINUE;
    END IF;

    ddl := format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s ON DELETE CASCADE',
      '__SCHEMA__', spec.tbl, spec.conname, spec.col, spec.ref
    );
    BEGIN
      EXECUTE ddl;
    EXCEPTION
      WHEN datatype_mismatch THEN
        RAISE NOTICE 'skipped FK % on %.%: column type mismatch (legacy table?)',
          spec.conname, '__SCHEMA__', spec.tbl;
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skipped FK % on %.%: not owner',
          spec.conname, '__SCHEMA__', spec.tbl;
      WHEN duplicate_object THEN
        NULL;  -- already exists (race)
      WHEN OTHERS THEN
        RAISE NOTICE 'skipped FK % on %.% (%): %',
          spec.conname, '__SCHEMA__', spec.tbl, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END
$sysadmin$;

-- ----------------------------------------------------------------------------
-- INDEXES — ownership-required when the table pre-exists; skip per statement.
-- ----------------------------------------------------------------------------

DO $sysadmin$
DECLARE
  stmts TEXT[] := ARRAY[
    'CREATE UNIQUE INDEX IF NOT EXISTS modules_route_path_key                ON "__SCHEMA__".modules (route_path)',
    'CREATE INDEX        IF NOT EXISTS idx_user_roles_user_id                ON "__SCHEMA__".user_roles (user_id)',
    'CREATE INDEX        IF NOT EXISTS idx_user_roles_role_id                ON "__SCHEMA__".user_roles (role_id)',
    'CREATE INDEX        IF NOT EXISTS idx_role_permissions_role_id          ON "__SCHEMA__".role_permissions (role_id)',
    'CREATE INDEX        IF NOT EXISTS idx_role_permissions_module_id        ON "__SCHEMA__".role_permissions (module_id)',
    'CREATE INDEX        IF NOT EXISTS idx_user_facilities_user_id           ON "__SCHEMA__".user_facilities (user_id)',
    'CREATE INDEX        IF NOT EXISTS idx_user_facilities_facilities_id     ON "__SCHEMA__".user_facilities (facilities_id)'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    BEGIN
      EXECUTE s;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skipped (not owner): %', s;
      WHEN OTHERS THEN
        RAISE NOTICE 'skipped (%): %', SQLSTATE, s;
    END;
  END LOOP;
END
$sysadmin$;

-- ----------------------------------------------------------------------------
-- RPC FUNCTIONS — recreated per schema. Namespaced into the chosen schema so
-- multiple schemas can coexist without clobbering each other's RPC.
-- ----------------------------------------------------------------------------

DO $sysadmin$
BEGIN
  BEGIN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION "__SCHEMA__".get_current_user_super_admin()
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      STABLE
      AS $fn$
      DECLARE
        v_result BOOLEAN := false;
      BEGIN
        IF auth.uid() IS NULL THEN
          RETURN false;
        END IF;

        SELECT EXISTS (
          SELECT 1
            FROM "__SCHEMA__".user_roles ur
            JOIN "__SCHEMA__".roles      r ON r.id = ur.role_id
           WHERE ur.user_id = auth.uid()
             AND r.role_code = 'super_admin'
        ) INTO v_result;

        RETURN v_result;
      END;
      $fn$
    $body$;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'skipped (not owner): get_current_user_super_admin';
    WHEN datatype_mismatch THEN
      RAISE NOTICE 'skipped get_current_user_super_admin: column type mismatch in roles/user_roles';
    WHEN OTHERS THEN
      RAISE NOTICE 'skipped (%): get_current_user_super_admin', SQLSTATE;
  END;
END
$sysadmin$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — per-table, ownership-required.
-- ----------------------------------------------------------------------------

DO $sysadmin$
DECLARE
  tbls TEXT[] := ARRAY[
    'pending_users','roles','modules','facilities',
    'user_roles','role_permissions','user_facilities'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', '__SCHEMA__', t);
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skipped RLS enable (not owner): %.%', '__SCHEMA__', t;
      WHEN OTHERS THEN
        RAISE NOTICE 'skipped RLS enable (%): %.%', SQLSTATE, '__SCHEMA__', t;
    END;
  END LOOP;
END
$sysadmin$;

-- ----------------------------------------------------------------------------
-- RLS POLICIES — per-policy, ownership-required.
-- ----------------------------------------------------------------------------

DO $sysadmin$
DECLARE
  pol_exists INT;
  spec RECORD;
  ddl  TEXT;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('pending_users',    'pending_users_r',     'SELECT', 'authenticated'),
      ('roles',            'roles_r',             'SELECT', 'authenticated'),
      ('modules',          'modules_r',           'SELECT', 'authenticated'),
      ('facilities',       'facilities_r',        'SELECT', 'authenticated'),
      ('user_roles',       'user_roles_r',        'SELECT', 'authenticated'),
      ('role_permissions', 'role_permissions_r',  'SELECT', 'authenticated'),
      ('user_facilities',  'user_facilities_r',   'SELECT', 'authenticated'),
      ('pending_users',    'pending_users_w',     'ALL',    'authenticated'),
      ('roles',            'roles_w',             'ALL',    'authenticated'),
      ('modules',          'modules_w',           'ALL',    'authenticated'),
      ('facilities',       'facilities_w',        'ALL',    'authenticated'),
      ('user_roles',       'user_roles_w',        'ALL',    'authenticated'),
      ('role_permissions', 'role_permissions_w',  'ALL',    'authenticated'),
      ('user_facilities',  'user_facilities_w',   'ALL',    'authenticated')
    ) AS t(tbl, pol, cmd, role)
  LOOP
    SELECT COUNT(*) INTO pol_exists FROM pg_policies
      WHERE schemaname = '__SCHEMA__' AND tablename = spec.tbl AND policyname = spec.pol;
    IF pol_exists = 0 THEN
      ddl := format(
        'CREATE POLICY %I ON %I.%I FOR %s TO %I USING (true)%s',
        spec.pol, '__SCHEMA__', spec.tbl, spec.cmd, spec.role,
        CASE WHEN spec.cmd = 'ALL' THEN ' WITH CHECK (true)' ELSE '' END
      );
      BEGIN
        EXECUTE ddl;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'skipped policy (not owner): % on %.%', spec.pol, '__SCHEMA__', spec.tbl;
        WHEN OTHERS THEN
          RAISE NOTICE 'skipped policy (%): % on %.%', SQLSTATE, spec.pol, '__SCHEMA__', spec.tbl;
      END;
    END IF;
  END LOOP;

  -- Anonymous INSERT on pending_users (registration before login)
  SELECT COUNT(*) INTO pol_exists FROM pg_policies
    WHERE schemaname = '__SCHEMA__' AND tablename = 'pending_users'
      AND policyname = 'pending_users_anon_insert';
  IF pol_exists = 0 THEN
    BEGIN
      EXECUTE format(
        'CREATE POLICY pending_users_anon_insert ON %I.pending_users FOR INSERT TO anon WITH CHECK (true)',
        '__SCHEMA__'
      );
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skipped policy (not owner): pending_users_anon_insert';
      WHEN OTHERS THEN
        RAISE NOTICE 'skipped policy (%): pending_users_anon_insert', SQLSTATE;
    END;
  END IF;
END
$sysadmin$;

-- ----------------------------------------------------------------------------
-- GRANTS — schema usage + per-table CRUD.
-- ----------------------------------------------------------------------------

DO $sysadmin$
DECLARE
  stmts TEXT[] := ARRAY[
    'GRANT USAGE ON SCHEMA "__SCHEMA__" TO authenticated',
    'GRANT USAGE ON SCHEMA "__SCHEMA__" TO service_role',
    'GRANT USAGE ON SCHEMA "__SCHEMA__" TO anon',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".pending_users    TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".roles            TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".modules          TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".facilities       TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".user_roles       TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".role_permissions TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".user_facilities  TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".pending_users    TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".roles            TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".modules          TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".facilities       TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".user_roles       TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".role_permissions TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "__SCHEMA__".user_facilities  TO service_role',
    'GRANT INSERT ON "__SCHEMA__".pending_users TO anon'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    BEGIN
      EXECUTE s;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skipped grant (not owner): %', s;
      WHEN OTHERS THEN
        RAISE NOTICE 'skipped grant (%): %', SQLSTATE, s;
    END;
  END LOOP;
END
$sysadmin$;
