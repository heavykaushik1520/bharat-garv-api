-- Admin accounts + password reset tokens (plain password storage per product requirement)

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(72) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email),
  KEY idx_admins_active (is_active),
  KEY idx_admins_active_created (is_active, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  requested_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_password_reset_token_hash (token_hash),
  KEY idx_admin_password_reset_admin_active (admin_id, used_at, expires_at),
  KEY idx_admin_password_reset_expires (expires_at),
  CONSTRAINT fk_admin_password_reset_admin
    FOREIGN KEY (admin_id) REFERENCES admins (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE mail_log
  MODIFY COLUMN mail_type ENUM(
    'password_reset',
    'registration_admin',
    'participation',
    'certificate',
    'contact',
    'admin_password_reset'
  ) NOT NULL;
