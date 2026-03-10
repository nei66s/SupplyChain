-- 038_multi_tenancy.sql

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the default tenant (Black Tower X)
INSERT INTO tenants (name, slug) 
VALUES ('Black Tower X', 'black-tower-x')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add tenant_id and migrate data
DO $$ 
DECLARE 
    t_id UUID;
BEGIN
    SELECT id INTO t_id FROM tenants WHERE slug = 'black-tower-x';

    -- Drop dependent views (CASCADE used to be sure)
    DROP MATERIALIZED VIEW IF EXISTS dashboard_orders_view CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS dashboard_production_tasks_view CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS dashboard_materials_stock_view CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS mv_inventory_receipts_snapshot CASCADE;

    -- Update Tables
    
    -- materials
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE materials SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE materials ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_sku_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_tenant_sku_key') THEN
        ALTER TABLE materials ADD CONSTRAINT materials_tenant_sku_key UNIQUE (tenant_id, sku);
    END IF;

    -- orders
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE orders SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;

    -- order_items
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE order_items SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE order_items ALTER COLUMN tenant_id SET NOT NULL;

    -- users
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE users SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_email_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email);
    END IF;

    -- clients
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE clients SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE clients ALTER COLUMN tenant_id SET NOT NULL;

    -- uoms
    ALTER TABLE uoms ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE uoms SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE uoms ALTER COLUMN tenant_id SET NOT NULL;

    -- Handle UOM dependencies
    ALTER TABLE uom_conversions DROP CONSTRAINT IF EXISTS uom_conversions_from_uom_fkey;
    ALTER TABLE uom_conversions DROP CONSTRAINT IF EXISTS uom_conversions_to_uom_fkey;
    ALTER TABLE uoms DROP CONSTRAINT IF EXISTS uoms_code_key;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uoms_tenant_code_key') THEN
        ALTER TABLE uoms ADD CONSTRAINT uoms_tenant_code_key UNIQUE (tenant_id, code);
    END IF;

    -- uom_conversions
    ALTER TABLE uom_conversions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE uom_conversions SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE uom_conversions ALTER COLUMN tenant_id SET NOT NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uom_conversions_tenant_from_uom_fkey') THEN
        ALTER TABLE uom_conversions ADD CONSTRAINT uom_conversions_tenant_from_uom_fkey 
        FOREIGN KEY (tenant_id, from_uom) REFERENCES uoms(tenant_id, code) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uom_conversions_tenant_to_uom_fkey') THEN
        ALTER TABLE uom_conversions ADD CONSTRAINT uom_conversions_tenant_to_uom_fkey 
        FOREIGN KEY (tenant_id, to_uom) REFERENCES uoms(tenant_id, code) ON DELETE CASCADE;
    END IF;

    -- stock_balances
    ALTER TABLE stock_balances ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE stock_balances SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE stock_balances ALTER COLUMN tenant_id SET NOT NULL;

    -- stock_reservations
    ALTER TABLE stock_reservations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE stock_reservations SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE stock_reservations ALTER COLUMN tenant_id SET NOT NULL;

    -- production_reservations
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_reservations') THEN
        ALTER TABLE production_reservations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE production_reservations SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE production_reservations ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- inventory_receipts
    ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE inventory_receipts SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE inventory_receipts ALTER COLUMN tenant_id SET NOT NULL;

    -- inventory_receipt_items
    ALTER TABLE inventory_receipt_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE inventory_receipt_items SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE inventory_receipt_items ALTER COLUMN tenant_id SET NOT NULL;

    -- notifications
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE notifications SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;

    -- audit_events
    ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE audit_events SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE audit_events ALTER COLUMN tenant_id SET NOT NULL;

    -- mrp_suggestions
    ALTER TABLE mrp_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE mrp_suggestions SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE mrp_suggestions ALTER COLUMN tenant_id SET NOT NULL;

    -- metrics_daily
    ALTER TABLE metrics_daily ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE metrics_daily SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE metrics_daily ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE metrics_daily DROP CONSTRAINT IF EXISTS metrics_daily_date_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'metrics_daily_tenant_date_key') THEN
        ALTER TABLE metrics_daily ADD CONSTRAINT metrics_daily_tenant_date_key UNIQUE (tenant_id, date);
    END IF;

    -- site_settings
    ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE site_settings SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE site_settings ALTER COLUMN tenant_id SET NOT NULL;

    -- production_tasks
    ALTER TABLE production_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    UPDATE production_tasks SET tenant_id = t_id WHERE tenant_id IS NULL;
    ALTER TABLE production_tasks ALTER COLUMN tenant_id SET NOT NULL;

    -- preconditions
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'preconditions') THEN
        ALTER TABLE preconditions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE preconditions SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE preconditions ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- inventory_adjustments
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_adjustments') THEN
        ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE inventory_adjustments SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE inventory_adjustments ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- people_activity_log
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'people_activity_log') THEN
        ALTER TABLE people_activity_log ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE people_activity_log SET tenant_id = t_id WHERE tenant_id IS NULL;
        ALTER TABLE people_activity_log ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- Recreate Views with tenant_id
    CREATE MATERIALIZED VIEW dashboard_orders_view AS
    SELECT
      o.id AS order_id,
      o.order_number,
      o.status,
      o.total,
      o.created_at,
      o.due_date,
      o.trashed_at,
      o.client_id,
      o.client_name,
      o.created_by,
      o.picker_id,
      o.volume_count,
      o.label_print_count,
      o.tenant_id,
      oi.id AS item_id,
      oi.material_id,
      oi.quantity,
      oi.conditions,
      oi.unit_price,
      oi.color,
      oi.shortage_action,
      oi.qty_reserved_from_stock,
      oi.qty_to_produce,
      oi.qty_separated,
      oi.separated_weight,
      oi.item_condition,
      oi.condition_template_name,
      m.name AS material_name,
      m.unit AS material_unit
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN materials m ON m.id = oi.material_id;

    CREATE INDEX ON dashboard_orders_view (order_id);
    CREATE INDEX ON dashboard_orders_view (tenant_id, created_at);

    CREATE MATERIALIZED VIEW dashboard_production_tasks_view AS
    SELECT
      pt.id,
      pt.order_id,
      pt.material_id,
      pt.qty_to_produce,
      pt.status,
      pt.created_at,
      pt.updated_at,
      pt.tenant_id,
      o.order_number,
      m.name AS material_name
    FROM production_tasks pt
    JOIN orders o ON o.id = pt.order_id
    LEFT JOIN materials m ON m.id = pt.material_id
    WHERE o.trashed_at IS NULL
      AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado', 'rascunho', 'draft'));

    CREATE INDEX ON dashboard_production_tasks_view (order_id);
    CREATE INDEX ON dashboard_production_tasks_view (tenant_id, created_at);

    CREATE MATERIALIZED VIEW dashboard_materials_stock_view AS
    SELECT
      m.id,
      m.sku,
      m.name,
      m.description,
      m.unit,
      m.min_stock,
      m.reorder_point,
      m.setup_time_minutes,
      m.production_time_per_unit_minutes,
      m.color_options,
      m.metadata,
      m.tenant_id,
      COALESCE((
        SELECT SUM(sr.qty)::NUMERIC(12,4)
        FROM stock_reservations sr
        WHERE sr.material_id = m.id
          AND sr.expires_at > now()
      ), 0) AS reserved_total,
      COALESCE((SELECT SUM(qty)::NUMERIC(12,4) FROM production_reservations pr WHERE pr.material_id = m.id), 0) AS production_reserved,
      COALESCE(sb.on_hand, 0) AS on_hand
    FROM materials m
    LEFT JOIN stock_balances sb ON sb.material_id = m.id;

    CREATE UNIQUE INDEX ON dashboard_materials_stock_view (id);
    CREATE INDEX ON dashboard_materials_stock_view (tenant_id);

    CREATE MATERIALIZED VIEW mv_inventory_receipts_snapshot AS
    SELECT
      r.id,
      r.type,
      r.status,
      r.source_ref,
      r.created_at,
      r.posted_at,
      r.posted_by,
      r.auto_allocated,
      r.tenant_id,
      COALESCE(
        (json_agg(
          json_build_object(
            'material_id', i.material_id,
            'material_name', m.name,
            'qty', i.qty,
            'uom', i.uom
          )
        ) FILTER (WHERE i.id IS NOT NULL))::jsonb,
        '[]'::jsonb
      ) AS items,
      COUNT(i.id) AS item_count,
      COALESCE(SUM(i.qty)::NUMERIC(12,4), 0) AS total_qty
    FROM inventory_receipts r
    LEFT JOIN inventory_receipt_items i ON i.receipt_id = r.id
    LEFT JOIN materials m ON m.id = i.material_id
    GROUP BY r.id, r.type, r.status, r.source_ref, r.created_at, r.posted_at, r.posted_by, r.auto_allocated, r.tenant_id;

    CREATE UNIQUE INDEX ON mv_inventory_receipts_snapshot (id);
    CREATE INDEX ON mv_inventory_receipts_snapshot (tenant_id, created_at);

END $$;
