import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '../sql/migrate_students_export_indexes.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const statements = sql
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter((statement) => statement && !/^USE\s+/i.test(statement));

const connection = await pool.getConnection();

try {
  for (const statement of statements) {
    await connection.query(statement);
  }

  const [indexes] = await connection.query(
    `SHOW INDEX FROM users
     WHERE Key_name IN ('idx_users_name_sort', 'idx_users_status_created', 'idx_users_language_active')`
  );

  const names = [...new Set(indexes.map((row) => row.Key_name))];
  console.log(`Migration applied. Indexes present: ${names.join(', ') || '(none)'}`);
} finally {
  connection.release();
  await pool.end();
}
