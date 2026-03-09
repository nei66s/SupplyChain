-- Add unique constraint to stock_balances.material_id to support ON CONFLICT
BEGIN;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'stock_balances'::regclass 
        AND contype = 'u' 
        AND conname = 'stock_balances_material_id_key'
    ) THEN
        ALTER TABLE stock_balances ADD CONSTRAINT stock_balances_material_id_key UNIQUE (material_id);
    END IF;
END $$;

COMMIT;
