CREATE UNIQUE INDEX IF NOT EXISTS idx_mrp_suggestions_material_id_unique
ON mrp_suggestions(material_id)
WHERE material_id IS NOT NULL;
