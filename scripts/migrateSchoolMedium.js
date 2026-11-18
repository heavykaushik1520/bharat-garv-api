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

async function indexExists(table, indexName) {
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND INDEX_NAME = :indexName
     LIMIT 1`,
    { table, indexName }
  );
  return Boolean(rows[0]);
}

if (!(await columnExists('schools', 'medium'))) {
  await pool.query(
    `ALTER TABLE schools
     ADD COLUMN medium VARCHAR(80) NOT NULL DEFAULT '' AFTER ward`
  );
  console.log('Added: schools.medium');
} else {
  console.log('OK: schools.medium exists');
}

if (await indexExists('schools', 'uq_schools_name_ward')) {
  await pool.query(`ALTER TABLE schools DROP INDEX uq_schools_name_ward`);
  console.log('Dropped: uq_schools_name_ward');
}

if (!(await indexExists('schools', 'uq_schools_name_ward_medium'))) {
  await pool.query(
    `ALTER TABLE schools
     ADD UNIQUE KEY uq_schools_name_ward_medium (name, ward, medium)`
  );
  console.log('Added: uq_schools_name_ward_medium');
} else {
  console.log('OK: uq_schools_name_ward_medium exists');
}

if (!(await indexExists('schools', 'idx_schools_medium'))) {
  await pool.query(`ALTER TABLE schools ADD KEY idx_schools_medium (medium)`);
  console.log('Added: idx_schools_medium');
} else {
  console.log('OK: idx_schools_medium exists');
}

await pool.end();
