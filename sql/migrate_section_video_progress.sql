USE quiz_db;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
