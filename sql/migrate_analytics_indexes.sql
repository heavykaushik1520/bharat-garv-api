-- Analytics performance indexes for competition participation reporting.
-- Safe to run multiple times (checks information_schema before ADD INDEX).
-- Requires MySQL 8.0+ for analytics queries that use window functions.

USE quiz_db;

-- Submissions: aggregate by user and join through sections quickly
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'program_section_submissions'
        AND index_name = 'idx_submissions_user'
    ),
    'SELECT 1',
    'ALTER TABLE program_section_submissions ADD KEY idx_submissions_user (user_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'program_section_submissions'
        AND index_name = 'idx_submissions_user_section'
    ),
    'SELECT 1',
    'ALTER TABLE program_section_submissions ADD KEY idx_submissions_user_section (user_id, section_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Users: school / class grouping for participation reports
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_school_standard'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_school_standard (school_id, standard)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_standard_active'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_standard_active (standard, is_active)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'idx_users_active_school'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD KEY idx_users_active_school (is_active, school_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
