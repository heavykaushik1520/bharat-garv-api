-- Per-section random quiz serve count + durable student question assignments.
-- Safe to run multiple times.

USE quiz_db;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'program_sections'
        AND column_name = 'questions_to_serve'
    ),
    'SELECT 1',
    'ALTER TABLE program_sections
       ADD COLUMN questions_to_serve INT UNSIGNED NULL DEFAULT NULL
         AFTER sort_order'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'program_sections'
        AND constraint_name = 'chk_questions_to_serve'
    ),
    'SELECT 1',
    'ALTER TABLE program_sections
       ADD CONSTRAINT chk_questions_to_serve
         CHECK (questions_to_serve IS NULL OR questions_to_serve BETWEEN 1 AND 100)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS program_section_question_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  question_count INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_section_assignment (user_id, section_id),
  KEY idx_assignment_section (section_id),
  KEY idx_assignment_user (user_id),
  CONSTRAINT fk_assignment_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_assignment_section
    FOREIGN KEY (section_id) REFERENCES program_sections (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_assignment_question_count CHECK (question_count >= 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_section_assignment_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignment_id BIGINT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_question (assignment_id, question_id),
  UNIQUE KEY uq_assignment_sort (assignment_id, sort_order),
  KEY idx_assignment_q_question (question_id),
  CONSTRAINT fk_assignment_q_assignment
    FOREIGN KEY (assignment_id) REFERENCES program_section_question_assignments (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_assignment_q_question
    FOREIGN KEY (question_id) REFERENCES program_questions (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_assignment_q_sort CHECK (sort_order >= 1)
) ENGINE=InnoDB;
