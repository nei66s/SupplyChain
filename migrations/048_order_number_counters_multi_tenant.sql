-- Migration 048: Fix order_number_counters for Multi-Tenancy
-- Desc: Adds tenant_id to order_number_counters and updates its PK to allow per-tenant sequence isolation.

-- Step 1: Add column and link to tenants
ALTER TABLE order_number_counters ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 2: Populate and secure
DO $$ 
DECLARE 
    t_id UUID;
BEGIN
    -- Get any active tenant to avoid nulls in existing rows (prefer black-tower-x if exists)
    SELECT id INTO t_id FROM tenants WHERE slug = 'black-tower-x';
    IF t_id IS NULL THEN
        SELECT id INTO t_id FROM tenants LIMIT 1;
    END IF;

    IF t_id IS NOT NULL THEN
        UPDATE order_number_counters SET tenant_id = t_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- Step 3: Constraints and PK
ALTER TABLE order_number_counters ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE order_number_counters DROP CONSTRAINT IF EXISTS order_number_counters_pkey;
ALTER TABLE order_number_counters ADD PRIMARY KEY (tenant_id, day);

-- Step 4: Defaults
ALTER TABLE order_number_counters ALTER COLUMN tenant_id SET DEFAULT (NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- Step 5: Add Index (for RLS/Dash performance, though small table)
CREATE INDEX IF NOT EXISTS idx_order_number_counters_tenant_id ON order_number_counters (tenant_id);

-- Step 6: Enable RLS and create policy
DO $$
BEGIN
    EXECUTE 'ALTER TABLE order_number_counters ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE order_number_counters FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON order_number_counters';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON order_number_counters
              USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
              WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)';

    RAISE NOTICE 'order_number_counters updated for multi-tenancy and RLS enabled.';
END $$;
