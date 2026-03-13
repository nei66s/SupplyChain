const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

const sql = `
DROP MATERIALIZED VIEW IF EXISTS dashboard_materials_stock_view CASCADE;

CREATE MATERIALIZED VIEW dashboard_materials_stock_view AS
SELECT
  m.id, m.sku, m.name, m.description, m.unit, m.min_stock, m.reorder_point,
  m.setup_time_minutes, m.production_time_per_unit_minutes, m.color_options,
  m.metadata, m.tenant_id,
  COALESCE(sr_agg.total, 0) AS reserved_total,
  COALESCE(pr_agg.total, 0) AS production_reserved,
  COALESCE(sb.on_hand, 0) AS on_hand
FROM materials m
LEFT JOIN stock_balances sb ON sb.material_id = m.id
LEFT JOIN (
  SELECT material_id, SUM(qty)::NUMERIC(12,4) as total
  FROM stock_reservations
  WHERE expires_at > now()
  GROUP BY material_id
) sr_agg ON sr_agg.material_id = m.id
LEFT JOIN (
  SELECT material_id, SUM(qty)::NUMERIC(12,4) as total
  FROM production_reservations
  GROUP BY material_id
) pr_agg ON pr_agg.material_id = m.id;

CREATE UNIQUE INDEX ON dashboard_materials_stock_view (id);
CREATE INDEX ON dashboard_materials_stock_view (tenant_id);
`;

pool.query(sql)
    .then(() => {
        console.log('Optimized dashboard_materials_stock_view created successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error optimizing view:', err);
        process.exit(1);
    });
