ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS operation_mode TEXT NOT NULL DEFAULT 'BOTH';

UPDATE tenants
SET operation_mode = 'BOTH'
WHERE operation_mode IS NULL
   OR operation_mode NOT IN ('QUANTITY', 'WEIGHT', 'BOTH');
