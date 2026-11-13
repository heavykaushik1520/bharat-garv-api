-- Restrict users.standard to 5–9 (was 1–9).
-- Run after ensuring no active rows still use standards 1–4.

USE quiz_db;

-- Fail fast if invalid data remains
SELECT COUNT(*) AS invalid_standards
FROM users
WHERE standard < 5 OR standard > 9;

ALTER TABLE users
  DROP CHECK chk_users_standard;

ALTER TABLE users
  ADD CONSTRAINT chk_users_standard CHECK (standard BETWEEN 5 AND 9);
