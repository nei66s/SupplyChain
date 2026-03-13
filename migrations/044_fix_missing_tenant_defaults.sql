-- Migration 044: Fix Missing Tenant Defaults
-- Desc: Sets a default value for tenant_id based on app.current_tenant_id for all multi-tenant tables.
-- This ensures that INSERTS don't fail if tenant_id is omitted, provided the session context is set.

DO $$ 
DECLARE 
    tbl RECORD;
    default_expr TEXT := 'NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID';
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
          AND table_name NOT IN ('tenants')
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT (%s)', tbl.table_name, default_expr);
        RAISE NOTICE 'Default tenant_id set para tabela: %', tbl.table_name;
    END LOOP;
END $$;
