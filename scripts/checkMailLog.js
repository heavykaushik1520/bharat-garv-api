import 'dotenv/config';
import pool from '../src/config/db.js';

const [rows] = await pool.query(
  `SELECT id, mail_type, to_email, subject, status, error_message, created_at
   FROM mail_log
   ORDER BY id DESC
   LIMIT 5`
);
console.log(JSON.stringify(rows, null, 2));
await pool.end();
