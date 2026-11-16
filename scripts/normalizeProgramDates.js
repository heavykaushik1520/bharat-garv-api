import pool from '../src/config/db.js';

const [result] = await pool.query(`
  UPDATE programs
  SET starts_at = CONCAT(DATE(starts_at), ' 00:00:00'),
      ends_at = CONCAT(DATE(ends_at), ' 23:59:59')
`);

console.log('Normalized program date rows:', result.affectedRows);

const [rows] = await pool.query('SELECT id, starts_at, ends_at FROM programs');
console.log(rows);

await pool.end();
