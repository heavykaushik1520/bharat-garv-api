import 'dotenv/config';
import pool from '../src/config/db.js';

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
     LIMIT 1`,
    { table }
  );
  return Boolean(rows[0]);
}

if (await tableExists('mail_log')) {
  await pool.query(
    `ALTER TABLE mail_log
     MODIFY COLUMN mail_type ENUM(
       'password_reset',
       'registration_admin',
       'participation',
       'certificate',
       'contact'
     ) NOT NULL`
  );
  console.log('Updated: mail_log.mail_type includes contact');
} else {
  console.log('Skip: mail_log missing');
}

await pool.end();
