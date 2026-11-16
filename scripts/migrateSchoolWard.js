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

if (!(await columnExists('schools', 'ward'))) {
  await pool.query(
    `ALTER TABLE schools
     ADD COLUMN ward VARCHAR(120) NOT NULL DEFAULT '' AFTER name`
  );
  console.log('Added: schools.ward');
} else {
  console.log('OK: schools.ward exists');
}

if (await indexExists('schools', 'uq_schools_name')) {
  await pool.query(`ALTER TABLE schools DROP INDEX uq_schools_name`);
  console.log('Dropped: uq_schools_name');
}

if (!(await indexExists('schools', 'uq_schools_name_ward'))) {
  await pool.query(
    `ALTER TABLE schools
     ADD UNIQUE KEY uq_schools_name_ward (name, ward)`
  );
  console.log('Added: uq_schools_name_ward');
} else {
  console.log('OK: uq_schools_name_ward exists');
}

if (!(await indexExists('schools', 'idx_schools_ward'))) {
  await pool.query(`ALTER TABLE schools ADD KEY idx_schools_ward (ward)`);
  console.log('Added: idx_schools_ward');
}

if (!(await indexExists('schools', 'idx_schools_name_active'))) {
  await pool.query(
    `ALTER TABLE schools ADD KEY idx_schools_name_active (is_active, name)`
  );
  console.log('Added: idx_schools_name_active');
}

await pool.end();
