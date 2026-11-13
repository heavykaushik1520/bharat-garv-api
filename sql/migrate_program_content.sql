USE quiz_db;

-- Invariant: every active section must keep >= 1 active question
-- (see migrate_section_requires_questions.sql for cleanup + trigger)

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_section_submissions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_submissions_section
    FOREIGN KEY (section_id) REFERENCES program_sections (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
