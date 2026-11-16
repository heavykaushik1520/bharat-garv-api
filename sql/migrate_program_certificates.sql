USE quiz_db;

CREATE TABLE IF NOT EXISTS program_certificates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  certificate_code VARCHAR(32) NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  school_name VARCHAR(180) NOT NULL,
  division CHAR(1) NOT NULL,
  roll_number VARCHAR(20) NOT NULL,
  standard TINYINT UNSIGNED NOT NULL,
  program_heading VARCHAR(220) NOT NULL,
  issued_at DATETIME NOT NULL,
  emailed_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_program_certificates_user_program (user_id, program_id),
  UNIQUE KEY uq_program_certificates_code (certificate_code),
  KEY idx_program_certificates_program_issued (program_id, issued_at),
  KEY idx_program_certificates_issued (issued_at),
  CONSTRAINT fk_program_certificates_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_program_certificates_program
    FOREIGN KEY (program_id) REFERENCES programs (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
