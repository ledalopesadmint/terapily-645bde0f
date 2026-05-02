CREATE UNIQUE INDEX idx_activity_catalog_single_featured
ON activity_catalog (is_featured)
WHERE is_featured = true;