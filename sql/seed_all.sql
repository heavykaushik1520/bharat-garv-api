-- Bharat Garv / quiz_db — full schema + dummy seed
-- Dummy student login: student1@example.com / Welcome@123
-- (same password for student2@example.com)

CREATE DATABASE IF NOT EXISTS quiz_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quiz_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS program_section_answers;
DROP TABLE IF EXISTS program_section_submissions;
DROP TABLE IF EXISTS program_section_video_progress;
DROP TABLE IF EXISTS program_question_options;
DROP TABLE IF EXISTS program_questions;
DROP TABLE IF EXISTS program_sections;
DROP TABLE IF EXISTS programs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS schools;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE schools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  city VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schools_name (name),
  KEY idx_schools_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
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
  KEY idx_users_language (preferred_language),
  KEY idx_users_created_at (created_at),
  CONSTRAINT fk_users_school
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_users_standard CHECK (standard BETWEEN 5 AND 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE programs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invariant: every active section must have >= 1 active question
CREATE TABLE program_sections (
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

CREATE TABLE program_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  headline_en VARCHAR(400) NOT NULL,
  headline_hi VARCHAR(400) NOT NULL,
  headline_mr VARCHAR(400) NOT NULL,
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

CREATE TABLE program_question_options (
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

CREATE TABLE program_section_video_progress (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE program_section_submissions (
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

CREATE TABLE program_section_answers (
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

-- ---------------------------------------------------------------------------
-- DUMMY DATA
-- ---------------------------------------------------------------------------

INSERT INTO schools (id, name, city, is_active) VALUES
  (1, 'Bharatiya Vidya Bhavan', 'Mumbai', 1),
  (2, 'Don Bosco High School', 'Mumbai', 1),
  (3, 'St. Xavier''s High School', 'Mumbai', 1),
  (4, 'Ryan International School', 'Mumbai', 1),
  (5, 'Atomic Energy Central School', 'Mumbai', 1);

-- password / encrypted_password for Welcome@123 (bcrypt cost 12)
INSERT INTO users (
  id, email, password, encrypted_password, phone, first_name, last_name,
  school_id, standard, division, roll_number, preferred_language, is_active
) VALUES
  (
    1,
    'student1@example.com',
    'Welcome@123',
    '$2b$12$NuQ3gGJRo3EPen9XV2Hz3.YgErnMGiVHUNukkEyzuJJ/RnvLFvdQ6',
    '9876543210',
    'Aarav',
    'Sharma',
    1, 5, 'A', '12', 'en', 1
  ),
  (
    2,
    'student2@example.com',
    'Welcome@123',
    '$2b$12$NuQ3gGJRo3EPen9XV2Hz3.YgErnMGiVHUNukkEyzuJJ/RnvLFvdQ6',
    '9876543211',
    'Priya',
    'Patil',
    2, 6, 'B', '08', 'hi', 1
  ),
  (
    3,
    'student3@example.com',
    'Welcome@123',
    '$2b$12$NuQ3gGJRo3EPen9XV2Hz3.YgErnMGiVHUNukkEyzuJJ/RnvLFvdQ6',
    '9876543212',
    'Rohan',
    'Deshmukh',
    3, 7, 'A', '21', 'mr', 1
  );

INSERT INTO programs (id, slug, heading_en, heading_hi, heading_mr, is_active) VALUES
  (
    1,
    'bharat-garv-quiz-program',
    'Bharat Garv Quiz Program',
    'भारत गर्व क्विज़ कार्यक्रम',
    'भारत गर्व क्विझ कार्यक्रम',
    1
  ),
  (
    2,
    'ancient-wonders-of-mumbai',
    'Ancient Wonders of Mumbai',
    'मुंबई के प्राचीन आश्चर्य',
    'मुंबईचे प्राचीन आश्चर्य',
    1
  );

INSERT INTO program_sections (
  id, program_id,
  title_en, title_hi, title_mr,
  subtitle_en, subtitle_hi, subtitle_mr,
  youtube_url_en, youtube_url_hi, youtube_url_mr,
  sort_order, is_active
) VALUES
  (
    1, 1,
    'Gateway of India',
    'गेटवे ऑफ इंडिया',
    'गेटवे ऑफ इंडिया',
    'Learn the story of Mumbai''s iconic monument.',
    'मुंबई के प्रतीक स्मारक की कहानी जानें।',
    'मुंबईच्या प्रतीक स्मारकाची कहाणी जाणून घ्या.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1, 1
  ),
  (
    2, 1,
    'Elephanta Caves',
    'एलिफेंटा गुफाएँ',
    'एलिफंटा लेणी',
    'Discover rock-cut heritage across the harbour.',
    'बंदरगाह के पार चट्टान-काटी विरासत खोजें।',
    'बंदरापलीकडील खडकात कोरलेला वारसा शोधा.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    2, 1
  ),
  (
    3, 2,
    'CSMT Heritage',
    'सीएसएमटी विरासत',
    'सीएसएमटी वारसा',
    'Explore Victorian Gothic architecture in Mumbai.',
    'मुंबई की विक्टोरियन गॉथिक वास्तुकला देखें।',
    'मुंबईतील व्हिक्टोरियन गॉथिक वास्तुकला पहा.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1, 1
  );

INSERT INTO program_questions (
  id, section_id,
  headline_en, headline_hi, headline_mr,
  has_image, image_url, sort_order, is_active
) VALUES
  (
    1, 1,
    'In which year was the Gateway of India completed?',
    'गेटवे ऑफ इंडिया किस वर्ष पूरा हुआ?',
    'गेटवे ऑफ इंडिया कोणत्या वर्षी पूर्ण झाले?',
    0, NULL, 1, 1
  ),
  (
    2, 1,
    'The Gateway of India was built to commemorate the visit of which monarch?',
    'गेटवे ऑफ इंडिया किस शासक की यात्रा की स्मृति में बनाया गया?',
    'गेटवे ऑफ इंडिया कोणत्या राज्यकर्त्याच्या भेटीच्या स्मरणार्थ बांधले गेले?',
    0, NULL, 2, 1
  ),
  (
    3, 2,
    'Elephanta Caves are dedicated mainly to which deity?',
    'एलिफेंटा गुफाएँ मुख्यतः किस देवता को समर्पित हैं?',
    'एलिफंटा लेणी प्रामुख्याने कोणत्या देवतेला समर्पित आहेत?',
    0, NULL, 1, 1
  ),
  (
    4, 3,
    'CSMT was formerly known as?',
    'सीएसएमटी पहले किस नाम से जानी जाती थी?',
    'सीएसएमटी पूर्वी कोणत्या नावाने ओळखली जात होती?',
    0, NULL, 1, 1
  );

INSERT INTO program_question_options (
  id, question_id, label_en, label_hi, label_mr, is_correct, sort_order
) VALUES
  -- Q1
  (1, 1, '1911', '1911', '1911', 0, 1),
  (2, 1, '1924', '1924', '1924', 1, 2),
  (3, 1, '1947', '1947', '1947', 0, 3),
  (4, 1, '1905', '1905', '1905', 0, 4),
  -- Q2
  (5, 2, 'Queen Victoria', 'रानी विक्टोरिया', 'राणी व्हिक्टोरिया', 0, 1),
  (6, 2, 'King George V', 'किंग जॉर्ज पंचम', 'किंग जॉर्ज पाचवा', 1, 2),
  (7, 2, 'King Edward VII', 'किंग एडवर्ड सप्तम', 'किंग एडवर्ड सातवा', 0, 3),
  (8, 2, 'Queen Elizabeth II', 'रानी एलिजाबेथ द्वितीय', 'राणी एलिझाबेथ दुसरी', 0, 4),
  -- Q3
  (9, 3, 'Vishnu', 'विष्णु', 'विष्णू', 0, 1),
  (10, 3, 'Shiva', 'शिव', 'शिव', 1, 2),
  (11, 3, 'Brahma', 'ब्रह्मा', 'ब्रह्मा', 0, 3),
  (12, 3, 'Ganesha', 'गणेश', 'गणेश', 0, 4),
  -- Q4
  (13, 4, 'Bombay Central', 'बॉम्बे सेंट्रल', 'बॉम्बे सेंट्रल', 0, 1),
  (14, 4, 'Victoria Terminus', 'विक्टोरिया टर्मिनस', 'व्हिक्टोरिया टर्मिनस', 1, 2),
  (15, 4, 'Churchgate Station', 'चर्चगेट स्टेशन', 'चर्चगेट स्टेशन', 0, 3),
  (16, 4, 'Marine Lines', 'मरीन लाइन्स', 'मरीन लाईन्स', 0, 4);

INSERT INTO program_section_video_progress (
  id, user_id, section_id,
  max_watched_seconds, duration_seconds, watch_percent, is_completed, completed_at
) VALUES
  (1, 1, 1, 120.00, 120.00, 100, 1, NOW()),
  (2, 1, 2, 45.00, 180.00, 25, 0, NULL),
  (3, 2, 1, 120.00, 120.00, 100, 1, NOW());

INSERT INTO program_section_submissions (
  id, user_id, section_id, correct_count, total_count, submitted_at
) VALUES
  (1, 1, 1, 2, 2, NOW()),
  (2, 2, 1, 1, 2, NOW());

INSERT INTO program_section_answers (
  id, submission_id, question_id, option_id, is_correct
) VALUES
  (1, 1, 1, 2, 1),
  (2, 1, 2, 6, 1),
  (3, 2, 1, 2, 1),
  (4, 2, 2, 5, 0);

-- Keep auto-increment counters aligned after explicit IDs
ALTER TABLE schools AUTO_INCREMENT = 6;
ALTER TABLE users AUTO_INCREMENT = 4;
ALTER TABLE programs AUTO_INCREMENT = 3;
ALTER TABLE program_sections AUTO_INCREMENT = 4;
ALTER TABLE program_questions AUTO_INCREMENT = 5;
ALTER TABLE program_question_options AUTO_INCREMENT = 17;
ALTER TABLE program_section_video_progress AUTO_INCREMENT = 4;
ALTER TABLE program_section_submissions AUTO_INCREMENT = 3;
ALTER TABLE program_section_answers AUTO_INCREMENT = 5;

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
