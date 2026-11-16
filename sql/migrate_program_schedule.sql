USE quiz_db;

-- Program competition window (UTC DATETIME)
ALTER TABLE programs
  ADD COLUMN starts_at DATETIME NULL AFTER heading_mr,
  ADD COLUMN ends_at DATETIME NULL AFTER starts_at;

-- Backfill existing rows: open for 1 year from creation
UPDATE programs
SET starts_at = COALESCE(created_at, UTC_TIMESTAMP()),
    ends_at = DATE_ADD(COALESCE(created_at, UTC_TIMESTAMP()), INTERVAL 365 DAY)
WHERE starts_at IS NULL OR ends_at IS NULL;

ALTER TABLE programs
  MODIFY COLUMN starts_at DATETIME NOT NULL,
  MODIFY COLUMN ends_at DATETIME NOT NULL;

ALTER TABLE programs
  ADD KEY idx_programs_schedule (is_active, starts_at, ends_at);
