ALTER TABLE production_tasks ADD COLUMN IF NOT EXISTS produced_qty DECIMAL(12,4);
ALTER TABLE production_tasks ADD COLUMN IF NOT EXISTS produced_weight DECIMAL(12,4);
