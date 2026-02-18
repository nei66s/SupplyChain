-- Full persistence schema for replacing pilot store
BEGIN;

-- Core master data
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uoms (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uom_conversions (
  id SERIAL PRIMARY KEY,
  from_uom TEXT NOT NULL REFERENCES uoms(code) ON DELETE CASCADE,
  to_uom TEXT NOT NULL REFERENCES uoms(code) ON DELETE CASCADE,
  factor NUMERIC(12, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (from_uom, to_uom)
);

-- Orders enrichment
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS picker_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS volume_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS label_print_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS shortage_action TEXT NOT NULL DEFAULT 'PRODUCE',
  ADD COLUMN IF NOT EXISTS qty_reserved_from_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_to_produce NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_separated NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS separated_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS item_condition TEXT,
  ADD COLUMN IF NOT EXISTS condition_template_name TEXT;

-- Stock balances and reservations
CREATE TABLE IF NOT EXISTS stock_balances (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL UNIQUE REFERENCES materials(id) ON DELETE CASCADE,
  on_hand NUMERIC(12,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (order_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_material ON stock_reservations(material_id);

-- Inventory receipts
CREATE TABLE IF NOT EXISTS inventory_receipts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'PRODUCTION',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  source_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  auto_allocated BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS inventory_receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES inventory_receipts(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'EA'
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  role_target TEXT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  dedupe_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key);

-- Audit events (order timeline)
CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details TEXT
);

-- MRP suggestions and daily metrics
CREATE TABLE IF NOT EXISTS mrp_suggestions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  suggested_reorder_point NUMERIC(12,4) NOT NULL DEFAULT 0,
  suggested_min_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
  suggested_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  orders_created INTEGER NOT NULL DEFAULT 0,
  receipts_posted INTEGER NOT NULL DEFAULT 0,
  picks_completed INTEGER NOT NULL DEFAULT 0
);

COMMIT;
