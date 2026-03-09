BEGIN;

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
LEFT JOIN stock_balances sb ON sb.material_id = m.id;

CREATE INDEX ON dashboard_materials_stock_view (id);

COMMIT;
