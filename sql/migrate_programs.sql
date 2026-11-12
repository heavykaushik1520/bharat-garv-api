USE quiz_db;

CREATE TABLE IF NOT EXISTS programs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  heading_en VARCHAR(220) NOT NULL,
  heading_hi VARCHAR(220) NOT NULL,
  heading_mr VARCHAR(220) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_programs_active (is_active),
  KEY idx_programs_created_at (created_at),
  KEY idx_programs_heading_en (heading_en)
) ENGINE=InnoDB;
