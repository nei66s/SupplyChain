-- Migration: create production_reservations table
CREATE TABLE IF NOT EXISTS production_reservations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT production_reservations_unique_order_material UNIQUE (order_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_production_reservations_material_id ON production_reservations(material_id);
CREATE INDEX IF NOT EXISTS idx_production_reservations_order_id ON production_reservations(order_id);
