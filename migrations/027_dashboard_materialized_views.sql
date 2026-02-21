BEGIN;

DROP MATERIALIZED VIEW IF EXISTS dashboard_orders_view;
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
CREATE INDEX ON dashboard_orders_view (created_at);

DROP MATERIALIZED VIEW IF EXISTS dashboard_production_tasks_view;
CREATE MATERIALIZED VIEW dashboard_production_tasks_view AS
SELECT
  pt.id,
  pt.order_id,
  pt.material_id,
  pt.qty_to_produce,
  pt.status,
  pt.created_at,
  pt.updated_at,
  o.order_number,
  m.name AS material_name
FROM production_tasks pt
JOIN orders o ON o.id = pt.order_id
LEFT JOIN materials m ON m.id = pt.material_id
WHERE o.trashed_at IS NULL
  AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado', 'rascunho', 'draft'));

CREATE INDEX ON dashboard_production_tasks_view (order_id);
CREATE INDEX ON dashboard_production_tasks_view (created_at);

DROP MATERIALIZED VIEW IF EXISTS dashboard_materials_stock_view;
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
  COALESCE((
    SELECT SUM(sr.qty)::NUMERIC(12,4)
    FROM stock_reservations sr
    WHERE sr.material_id = m.id
      AND sr.expires_at > now()
  ), 0) AS reserved_total,
  COALESCE((SELECT SUM(qty)::NUMERIC(12,4) FROM production_reservations pr WHERE pr.material_id = m.id), 0) AS production_reserved,
  COALESCE(sb.on_hand, 0) AS on_hand
FROM materials m
LEFT JOIN stock_balances sb ON sb.material_id = m.id
GROUP BY m.id, sb.on_hand;

CREATE INDEX ON dashboard_materials_stock_view (id);

COMMIT;
