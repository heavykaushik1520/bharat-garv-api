CREATE DATABASE IF NOT EXISTS quiz_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quiz_db;

CREATE TABLE IF NOT EXISTS schools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  city VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schools_name (name),
  KEY idx_schools_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(72) NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  school_id INT UNSIGNED NOT NULL,
  standard TINYINT UNSIGNED NOT NULL,
  division VARCHAR(10) NOT NULL,
  roll_number VARCHAR(20) NOT NULL,
  preferred_language ENUM('en', 'hi', 'mr') NOT NULL DEFAULT 'en',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_school_std_div_roll (school_id, standard, division, roll_number),
  KEY idx_users_school_id (school_id),
  KEY idx_users_school_standard (school_id, standard),
  KEY idx_users_standard_active (standard, is_active),
  KEY idx_users_active_school (is_active, school_id),
  KEY idx_users_language (preferred_language),
  KEY idx_users_created_at (created_at),
  CONSTRAINT fk_users_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_users_standard CHECK (standard BETWEEN 5 AND 9)
) ENGINE=InnoDB;

INSERT INTO schools (name, city, is_active) VALUES
  ('Bharatiya Vidya Bhavan', 'Mumbai', 1),
  ('Don Bosco High School', 'Mumbai', 1),
  ('St. Xavier''s High School', 'Mumbai', 1),
  ('Ryan International School', 'Mumbai', 1),
  ('Atomic Energy Central School', 'Mumbai', 1),
  ('Cathedral & John Connon School', 'Mumbai', 1),
  ('Bombay Scottish School', 'Mumbai', 1),
  ('Jamnabai Narsee School', 'Mumbai', 1)
ON DUPLICATE KEY UPDATE
  city = VALUES(city),
  is_active = VALUES(is_active);

CREATE TABLE IF NOT EXISTS programs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  heading_en VARCHAR(220) NOT NULL,
  heading_hi VARCHAR(220) NOT NULL,
  heading_mr VARCHAR(220) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_programs_slug (slug),
  KEY idx_programs_active (is_active),
  KEY idx_programs_created_at (created_at),
  KEY idx_programs_heading_en (heading_en)
) ENGINE=InnoDB;

-- Invariant: every active section must have >= 1 active question
-- (enforced in API + trg_program_questions_keep_one_active)
CREATE TABLE IF NOT EXISTS program_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_id INT UNSIGNED NOT NULL,
  title_en VARCHAR(220) NOT NULL,
  title_hi VARCHAR(220) NOT NULL,
  title_mr VARCHAR(220) NOT NULL,
  subtitle_en VARCHAR(400) NOT NULL,
  subtitle_hi VARCHAR(400) NOT NULL,
  subtitle_mr VARCHAR(400) NOT NULL,
  youtube_url_en VARCHAR(500) NOT NULL,
  youtube_url_hi VARCHAR(500) NOT NULL,
  youtube_url_mr VARCHAR(500) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_program_sections_program (program_id, is_active, sort_order),
  CONSTRAINT fk_program_sections_program
    FOREIGN KEY (program_id) REFERENCES programs (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  headline_en VARCHAR(1000) NOT NULL,
  headline_hi VARCHAR(1000) NOT NULL,
  headline_mr VARCHAR(1000) NOT NULL,
  has_image TINYINT(1) NOT NULL DEFAULT 0,
  image_url VARCHAR(500) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_program_questions_section (section_id, is_active, sort_order),
  CONSTRAINT fk_program_questions_section
    FOREIGN KEY (section_id) REFERENCES program_sections (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_program_questions_image
    CHECK (
      (has_image = 0 AND image_url IS NULL)
      OR (has_image = 1 AND image_url IS NOT NULL AND CHAR_LENGTH(image_url) >= 8)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_question_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  label_en VARCHAR(300) NOT NULL,
  label_hi VARCHAR(300) NOT NULL,
  label_mr VARCHAR(300) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_question_option_order (question_id, sort_order),
  KEY idx_question_options_question (question_id),
  KEY idx_question_options_correct (question_id, is_correct),
  CONSTRAINT fk_program_question_options_question
    FOREIGN KEY (question_id) REFERENCES program_questions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_option_sort_order CHECK (sort_order BETWEEN 1 AND 4),
  CONSTRAINT chk_option_is_correct CHECK (is_correct IN (0, 1))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_section_video_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  max_watched_seconds DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_seconds DECIMAL(10,2) NOT NULL DEFAULT 0,
  watch_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_section_video (user_id, section_id),
  KEY idx_section_video_completed (section_id, is_completed),
  CONSTRAINT fk_section_video_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_video_section
    FOREIGN KEY (section_id) REFERENCES program_sections (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_section_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  correct_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_count INT UNSIGNED NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_section_submission (user_id, section_id),
  KEY idx_section_submissions_section (section_id),
  KEY idx_submissions_user (user_id),
  KEY idx_submissions_user_section (user_id, section_id),
  CONSTRAINT fk_section_submissions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_submissions_section
    FOREIGN KEY (section_id) REFERENCES program_sections (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_section_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  submission_id BIGINT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  option_id INT UNSIGNED NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission_question (submission_id, question_id),
  KEY idx_section_answers_question (question_id),
  CONSTRAINT fk_section_answers_submission
    FOREIGN KEY (submission_id) REFERENCES program_section_submissions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_answers_question
    FOREIGN KEY (question_id) REFERENCES program_questions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_answers_option
    FOREIGN KEY (option_id) REFERENCES program_question_options (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Prevent removing the last active question from an active section.
-- Section soft-delete must deactivate the section row before its questions.
DROP TRIGGER IF EXISTS trg_program_questions_keep_one_active;

DELIMITER $$

CREATE TRIGGER trg_program_questions_keep_one_active
BEFORE UPDATE ON program_questions
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    IF (
      SELECT s.is_active
      FROM program_sections s
      WHERE s.id = OLD.section_id
      LIMIT 1
    ) = 1 THEN
      IF (
        SELECT COUNT(*)
        FROM program_questions q
        WHERE q.section_id = OLD.section_id
          AND q.is_active = 1
          AND q.id <> OLD.id
      ) = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Each active section must keep at least one question';
      END IF;
    END IF;
  END IF;
END$$

DELIMITER ;
