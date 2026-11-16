import pool from '../src/config/db.js';

async function main() {
  const [cols] = await pool.query('SHOW COLUMNS FROM programs');
  const fields = new Set(cols.map((col) => col.Field));
  console.log('programs columns:', [...fields].join(', '));

  if (!fields.has('starts_at') || !fields.has('ends_at')) {
    await pool.query(`
      ALTER TABLE programs
        ADD COLUMN starts_at DATETIME NULL AFTER heading_mr,
        ADD COLUMN ends_at DATETIME NULL AFTER starts_at
    `);

    await pool.query(`
      UPDATE programs
      SET starts_at = COALESCE(created_at, UTC_TIMESTAMP()),
          ends_at = DATE_ADD(COALESCE(created_at, UTC_TIMESTAMP()), INTERVAL 365 DAY)
      WHERE starts_at IS NULL OR ends_at IS NULL
    `);

    await pool.query(`
      ALTER TABLE programs
        MODIFY COLUMN starts_at DATETIME NOT NULL,
        MODIFY COLUMN ends_at DATETIME NOT NULL
    `);

    try {
      await pool.query(`
        ALTER TABLE programs
          ADD KEY idx_programs_schedule (is_active, starts_at, ends_at)
      `);
    } catch {
      // index may already exist
    }

    console.log('Migration applied: starts_at / ends_at');
  } else {
    console.log('Migration already applied');
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
