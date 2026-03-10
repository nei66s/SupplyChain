-- 039_activate_rls.sql

DO $$ 
DECLARE 
    tbl RECORD;
    policy_name TEXT := 'tenant_isolation_policy';
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
          AND table_name NOT IN ('tenants')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl.table_name);

        -- Drop existing policies to ensure a clean state before creating new ones
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name || '_select', tbl.table_name);

        -- Create the new isolation policy
        IF tbl.table_name = 'site_settings' THEN
            -- site_settings allows public read (for the Landing Page) 
            -- but write only if the tenant_id matches
            EXECUTE format('
                CREATE POLICY %I ON %I
                FOR SELECT
                USING (true)
            ', policy_name || '_select', tbl.table_name);

            EXECUTE format('
                CREATE POLICY %I ON %I
                FOR ALL
                USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
                WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
            ', policy_name, tbl.table_name);
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON %I
                USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
                WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
            ', policy_name, tbl.table_name);
        END IF;

        RAISE NOTICE 'RLS Ativado para tabela: %', tbl.table_name;
    END LOOP;
END $$;
