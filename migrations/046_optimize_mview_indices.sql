-- Migration 046: Optimize Dashboard Materialized Views for Concurrent Refresh
-- Desc: Adds unique indices to materialized views that lack them, allowing CONCURRENT REFRESH which doesn't block reads.

DO $$
BEGIN
    -- 1. dashboard_orders_view
    -- We use a composite index because item_id can be NULL if an order has no items.
    -- However, for the dashboard, usually we care about the items.
    -- If there's an order without items, it will have item_id NULL. 
    -- But since we only have one such row per order_id, we can use a unique index on (order_id, item_id) 
    -- if we treat NULL as a value (which Postgres does in UNIQUE constraints since 15, but let's be safe).
    -- Actually, a better unique key is just (order_id, COALESCE(item_id, -1)).
    
    DROP INDEX IF EXISTS dashboard_orders_view_order_id_item_id_idx;
    CREATE UNIQUE INDEX dashboard_orders_view_order_id_item_id_idx ON dashboard_orders_view (order_id, COALESCE(item_id, -1));

    -- 2. dashboard_production_tasks_view
    -- pt.id is the primary key of production_tasks, so it's unique in the view.
    DROP INDEX IF EXISTS dashboard_production_tasks_view_id_idx;
    CREATE UNIQUE INDEX dashboard_production_tasks_view_id_idx ON dashboard_production_tasks_view (id);

    RAISE NOTICE 'Unique indices added to materialized views for concurrent refresh.';
END $$;
