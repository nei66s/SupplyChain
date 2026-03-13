-- Migration 047: Fix Materialized View Indices for Concurrent Refresh and Optimize Notification Queries
-- Desc: Adds a stable unique column to dashboard_orders_view and ensures unique indices exist for all MVs.

BEGIN;

-- 1. Fix dashboard_orders_view
-- We need a stable, non-null unique ID for each row in the view to support CONCURRENT REFRESH.
-- Since it's a LEFT JOIN between orders (o) and order_items (oi), we can use:
-- If oi.id exists, use it. If not (empty order), use negative o.id to ensure uniqueness and stability.
DROP MATERIALIZED VIEW IF EXISTS dashboard_orders_view CASCADE;

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
  m.unit AS material_unit,
  -- Synthetic stable unique ID for row identification in concurrent refresh
  COALESCE(oi.id, -(o.id + 1000000)) AS unique_row_id
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN materials m ON m.id = oi.material_id;

-- Create the required UNIQUE index for concurrent refresh
CREATE UNIQUE INDEX idx_dashboard_orders_unique_row_id ON dashboard_orders_view (unique_row_id);
-- Other helpful indices for filtered queries
CREATE INDEX idx_dashboard_orders_tenant_created ON dashboard_orders_view (tenant_id, created_at DESC);
CREATE INDEX idx_dashboard_orders_order_id ON dashboard_orders_view (order_id);

-- 2. Ensure unique index for dashboard_production_tasks_view
-- pt.id is already unique and not null.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'dashboard_production_tasks_view' AND indexname = 'idx_dashboard_production_tasks_unique_id'
        OR (indexname = 'dashboard_production_tasks_view_id_idx') -- legacy from 046
    ) THEN
        CREATE UNIQUE INDEX idx_dashboard_production_tasks_unique_id ON dashboard_production_tasks_view (id);
    END IF;
END $$;

-- 3. Optimize notifications query (commonly seen in logs)
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created_at ON notifications (tenant_id, created_at DESC);

-- 4. Clean up faulty expression index from migration 046 if it exists
-- Migration 046 used: CREATE UNIQUE INDEX dashboard_orders_view_order_id_item_id_idx ON dashboard_orders_view (order_id, COALESCE(item_id, -1));
-- (This would have been dropped by CASCADE when we dropped the view, but let's be explicit if needed)
DROP INDEX IF EXISTS dashboard_orders_view_order_id_item_id_idx;

COMMIT;
