-- Adds a persistence layer for MRP suggestions so heuristics can be confirmed by a manager.
CREATE TABLE IF NOT EXISTS mrp_suggestions (
  id BIGSERIAL PRIMARY KEY,
  material_id TEXT NOT NULL UNIQUE,
  suggested_reorder_point NUMERIC NOT NULL DEFAULT 0,
  suggested_min_stock NUMERIC NOT NULL DEFAULT 0,
  suggested_qty NUMERIC NOT NULL DEFAULT 0,
  rationale TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  updated_by TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
