import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '../sql/migrate_section_question_serve.sql');
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

  const [columns] = await connection.query(
    `SHOW COLUMNS FROM program_sections LIKE 'questions_to_serve'`
  );
  const [tables] = await connection.query(
    `SHOW TABLES LIKE 'program_section_question_assignments'`
  );

  console.log(
    `Migration applied. questions_to_serve=${columns.length ? 'yes' : 'no'}; assignments=${
      tables.length ? 'yes' : 'no'
    }`
  );
} finally {
  connection.release();
  await pool.end();
}
