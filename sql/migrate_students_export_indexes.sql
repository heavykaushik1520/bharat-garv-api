-- Student list / export indexes for filtered admin downloads under load.
-- Safe to run multiple times (checks information_schema before ADD INDEX).

USE quiz_db;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_name_sort'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_name_sort (first_name, last_name, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_status_created'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_status_created (is_active, created_at, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_language_active'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_language_active (preferred_language, is_active, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
