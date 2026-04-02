ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS requested_weight NUMERIC(12,4);
