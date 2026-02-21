ALTER TABLE mrp_suggestions
DROP CONSTRAINT IF EXISTS mrp_suggestions_material_id_fkey;

ALTER TABLE mrp_suggestions
ALTER COLUMN material_id TYPE TEXT,
ALTER COLUMN material_id DROP NOT NULL,
ALTER COLUMN material_id SET DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mrp_suggestions_material_id ON mrp_suggestions(material_id);
