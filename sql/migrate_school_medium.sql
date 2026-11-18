-- Add medium to schools and unique on (name, ward, medium)
ALTER TABLE schools
  ADD COLUMN medium VARCHAR(80) NOT NULL DEFAULT '' AFTER ward;

ALTER TABLE schools
  DROP INDEX uq_schools_name_ward;

ALTER TABLE schools
  ADD UNIQUE KEY uq_schools_name_ward_medium (name, ward, medium);

ALTER TABLE schools
  ADD KEY idx_schools_medium (medium);
