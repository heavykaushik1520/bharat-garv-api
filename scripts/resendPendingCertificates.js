import 'dotenv/config';
import pool from '../src/config/db.js';
import { sendCertificateEmail } from '../src/services/certificateService.js';

/**
 * Resend certificate PDFs where emailed_at is still NULL.
 * Usage: node scripts/resendPendingCertificates.js
 */
const [rows] = await pool.query(
  `SELECT
     c.*,
     u.email,
     p.slug AS program_slug
   FROM program_certificates c
   INNER JOIN users u ON u.id = c.user_id
   INNER JOIN programs p ON p.id = c.program_id
   WHERE c.emailed_at IS NULL
   ORDER BY c.id ASC
   LIMIT 50`
);

if (!rows.length) {
  console.log('No pending certificate emails.');
  await pool.end();
  process.exit(0);
}

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

  const result = await sendCertificateEmail(certificate, row.program_slug);
  console.log(
    result.ok
      ? `SENT → ${row.email} (${row.certificate_code})`
      : `FAIL → ${row.email} (${row.certificate_code}): ${result.error}`
  );
}

await pool.end();
