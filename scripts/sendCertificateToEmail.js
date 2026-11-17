import 'dotenv/config';
import pool from '../src/config/db.js';
import { sendCertificateEmail } from '../src/services/certificateService.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/sendCertificateToEmail.js student@email.com');
  process.exit(1);
}

const [rows] = await pool.query(
  `SELECT c.*, u.email, p.slug AS program_slug
   FROM program_certificates c
   INNER JOIN users u ON u.id = c.user_id
   INNER JOIN programs p ON p.id = c.program_id
   WHERE LOWER(u.email) = :email
   ORDER BY c.id DESC`,
  { email }
);

if (!rows.length) {
  const [users] = await pool.query(
    `SELECT id, email, first_name, last_name
     FROM users
     WHERE LOWER(email) = :email
     LIMIT 1`,
    { email }
  );
  console.error('No certificate found for', email, 'user=', users[0] || null);
  await pool.end();
  process.exit(1);
}

let failed = 0;
for (const row of rows) {
  const certificate = {
    id: row.id,
    userId: row.user_id,
    programId: row.program_id,
    certificateCode: row.certificate_code,
    fullName: row.full_name,
    schoolName: row.school_name,
    division: row.division,
    rollNumber: row.roll_number,
    standard: Number(row.standard),
    programHeading: row.program_heading,
    issuedAt: row.issued_at,
    email: row.email,
  };

  console.log(`Sending ${row.certificate_code} → ${row.email} (${row.program_slug})`);
  const result = await sendCertificateEmail(certificate, row.program_slug);
  if (result.ok) {
    console.log('SENT OK');
  } else {
    failed += 1;
    console.error('FAIL:', result.error || result);
  }
}

await pool.end();
process.exit(failed ? 1 : 0);
