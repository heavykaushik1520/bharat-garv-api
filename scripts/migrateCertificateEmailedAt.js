import 'dotenv/config';
import pool from '../src/config/db.js';

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column
     LIMIT 1`,
    { table, column }
  );
  return Boolean(rows[0]);
}

if (!(await columnExists('program_certificates', 'emailed_at'))) {
  await pool.query(
    `ALTER TABLE program_certificates
     ADD COLUMN emailed_at DATETIME NULL DEFAULT NULL AFTER issued_at,
     ADD KEY idx_program_certificates_emailed (emailed_at)`
  );
  console.log('Added: program_certificates.emailed_at');
} else {
  console.log('OK: program_certificates.emailed_at exists');
}

await pool.end();
