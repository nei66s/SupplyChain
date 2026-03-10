-- 040_site_settings_multi_tenant_pk.sql

DO $$
BEGIN
    -- Drop the current primary key
    ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_pkey;
    
    -- Create a new primary key that includes tenant_id
    ALTER TABLE site_settings ADD CONSTRAINT site_settings_tenant_id_id_pkey PRIMARY KEY (tenant_id, id);

    RAISE NOTICE 'Site settings PK updated for multi-tenancy.';
END $$;
