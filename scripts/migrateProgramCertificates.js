import pool from '../src/config/db.js';

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
     LIMIT 1`,
    { table }
  );
  return rows.length > 0;
}

if (await tableExists('program_certificates')) {
  console.log('OK: program_certificates exists');
} else {
  await pool.query(`
    CREATE TABLE program_certificates (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created: program_certificates');
}

if (await tableExists('mail_log')) {
  await pool.query(`
    ALTER TABLE mail_log
    MODIFY COLUMN mail_type ENUM(
      'password_reset',
      'registration_admin',
      'participation',
      'certificate'
    ) NOT NULL
  `);
  console.log('Updated: mail_log.mail_type includes certificate');
}

await pool.end();
