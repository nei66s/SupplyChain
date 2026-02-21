ALTER TABLE mrp_suggestions
ALTER COLUMN material_id SET NOT NULL;

DROP INDEX IF EXISTS idx_mrp_suggestions_material_id_unique;

ALTER TABLE mrp_suggestions
ADD CONSTRAINT mrp_suggestions_material_id_key UNIQUE (material_id);
