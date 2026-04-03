BEGIN;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS requested_uom TEXT;

UPDATE order_items oi
SET requested_uom = COALESCE(oi.requested_uom, m.unit, 'EA')
FROM materials m
WHERE m.id = oi.material_id
  AND (oi.requested_uom IS NULL OR trim(oi.requested_uom) = '');

COMMIT;
