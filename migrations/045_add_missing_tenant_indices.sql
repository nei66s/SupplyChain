-- Migration 045: Add Missing Tenant Indices
-- Desc: Adds indices on tenant_id for all multi-tenant tables to optimize RLS queries and dashboard performance.

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
        -- Check if an index already exists where tenant_id is the first column
        IF NOT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = format('public.%I', tbl.table_name)::regclass
            AND a.attname = 'tenant_id'
            AND i.indkey[0] = a.attnum -- index starts with tenant_id
        ) THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', 'idx_' || tbl.table_name || '_tenant_id', tbl.table_name);
            RAISE NOTICE 'Index criado para tabela: %', tbl.table_name;
        ELSE
            RAISE NOTICE 'Index ja existe para tabela: %', tbl.table_name;
        END IF;
    END LOOP;
END $$;
