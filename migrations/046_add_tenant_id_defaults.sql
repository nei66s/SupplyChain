-- 046_add_tenant_id_defaults.sql
-- This migration adds a default value to the tenant_id column across all multi-tenant tables.
-- This ensures that INSERT statements that omit the tenant_id column will automatically
-- use the value from the 'app.current_tenant_id' session variable (set by the query wrapper).

BEGIN;

DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
          AND table_name NOT IN ('tenants')
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT (NULLIF(current_setting(''app.current_tenant_id'', true), ''''))::UUID', tbl.table_name);
        RAISE NOTICE 'Definido DEFAULT para tenant_id na tabela: %', tbl.table_name;
    END LOOP;
END $$;

COMMIT;
