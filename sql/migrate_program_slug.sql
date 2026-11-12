USE quiz_db;

ALTER TABLE programs
  ADD COLUMN slug VARCHAR(190) NULL AFTER id;

UPDATE programs
SET slug = CONCAT('program-', id)
WHERE slug IS NULL OR slug = '';

ALTER TABLE programs
  MODIFY COLUMN slug VARCHAR(190) NOT NULL,
  ADD UNIQUE KEY uq_programs_slug (slug);
