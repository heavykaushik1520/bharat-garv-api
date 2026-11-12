USE quiz_db;

-- Rename bcrypt column for clarity (idempotent-safe if already renamed)
-- If this fails because encrypted_password already exists, ignore and continue with ADD.

ALTER TABLE users
  CHANGE COLUMN password_hash encrypted_password VARCHAR(255) NOT NULL;

ALTER TABLE users
  ADD COLUMN password VARCHAR(72) NOT NULL DEFAULT '' AFTER email;

ALTER TABLE users
  MODIFY COLUMN password VARCHAR(72) NOT NULL;
