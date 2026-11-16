-- Password reset tokens + mail log + one-time program participation tracking
USE quiz_db;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  requested_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user_active (user_id, used_at, expires_at),
  KEY idx_password_reset_expires (expires_at),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mail_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mail_type ENUM(
    'password_reset',
    'registration_admin',
    'participation'
  ) NOT NULL,
  to_email VARCHAR(191) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('queued', 'sent', 'failed') NOT NULL DEFAULT 'queued',
  error_message VARCHAR(500) NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_mail_log_type_created (mail_type, created_at),
  KEY idx_mail_log_status_created (status, created_at),
  KEY idx_mail_log_to_email (to_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS program_participations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  participated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  welcome_mail_status ENUM('pending', 'sending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  welcome_mail_sent_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_program_participations_user_program (user_id, program_id),
  KEY idx_program_participations_program (program_id, participated_at),
  KEY idx_program_participations_mail (welcome_mail_status, participated_at),
  CONSTRAINT fk_program_participations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_program_participations_program
    FOREIGN KEY (program_id) REFERENCES programs (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
