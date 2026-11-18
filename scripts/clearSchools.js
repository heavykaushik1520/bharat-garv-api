import 'dotenv/config';
import pool from '../src/config/db.js';

const [before] = await pool.query(
  `SELECT
     COUNT(*) AS total,
     SUM(is_active = 1) AS active,
     SUM(is_active = 0) AS inactive
   FROM schools`
);
const [linked] = await pool.query(
  `SELECT COUNT(DISTINCT school_id) AS schoolsWithUsers FROM users`
);

console.log('Before:', before[0]);
console.log('Schools linked to students:', linked[0].schoolsWithUsers);

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  const [deactivated] = await connection.query(
    `UPDATE schools SET is_active = 0 WHERE is_active = 1`
  );

  const [deleted] = await connection.query(
    `DELETE s
     FROM schools s
     LEFT JOIN users u ON u.school_id = s.id
     WHERE u.id IS NULL`
  );

  await connection.commit();

  console.log('Deactivated active schools:', deactivated.affectedRows);
  console.log('Hard-deleted unlinked schools:', deleted.affectedRows);
} catch (error) {
  await connection.rollback();
  console.error('Failed:', error.message);
  process.exitCode = 1;
} finally {
  connection.release();
}

const [after] = await pool.query(
  `SELECT
     COUNT(*) AS total,
     SUM(is_active = 1) AS active,
     SUM(is_active = 0) AS inactive
   FROM schools`
);
console.log('After:', after[0]);
console.log(
  'Signup school list is empty. You can upload the new Excel/CSV now.'
);

await pool.end();
