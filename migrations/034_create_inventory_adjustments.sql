-- Migration to track manual inventory adjustments
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  qty_before NUMERIC(12,4) NOT NULL,
  qty_after NUMERIC(12,4) NOT NULL,
  adjustment_qty NUMERIC(12,4) NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_adjustments_material ON inventory_adjustments(material_id);
CREATE INDEX idx_inventory_adjustments_created_at ON inventory_adjustments(created_at);
