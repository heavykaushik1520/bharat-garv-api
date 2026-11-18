import 'dotenv/config';
import pool from '../src/config/db.js';
import { sendCertificateEmail } from '../src/services/certificateService.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/refreshAndSendCertificate.js student@email.com');
  process.exit(1);
}

const [users] = await pool.query(
  `SELECT u.id, u.email, u.first_name, u.last_name, u.standard, u.division, u.roll_number,
          s.name AS school_name, s.ward AS school_ward, s.medium AS school_medium
   FROM users u
   INNER JOIN schools s ON s.id = u.school_id
   WHERE LOWER(u.email) = :email
   LIMIT 1`,
  { email }
);

if (!users[0]) {
  console.error('User not found:', email);
  await pool.end();
  process.exit(1);
}

const user = users[0];
const schoolName = String(user.school_ward || '').trim()
  ? `${String(user.school_name).trim()}, ${String(user.school_ward).trim()}`
  : String(user.school_name || '').trim();
const fullName = `${user.first_name} ${user.last_name}`.replace(/\s+/g, ' ').trim();
const division =
  String(user.division || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 1) || 'A';
const rollNumber = String(user.roll_number || '').trim().slice(0, 20);
const standard = Number(user.standard);

const [certs] = await pool.query(
  `SELECT c.*, p.slug AS program_slug
   FROM program_certificates c
   INNER JOIN programs p ON p.id = c.program_id
   WHERE c.user_id = :userId
   ORDER BY c.id DESC`,
  { userId: user.id }
);

if (!certs.length) {
  console.error('No certificate found for', email);
  await pool.end();
  process.exit(1);
}

let failed = 0;
for (const row of certs) {
  await pool.query(
    `UPDATE program_certificates
     SET full_name = :fullName,
         school_name = :schoolName,
         division = :division,
         roll_number = :rollNumber,
         standard = :standard
     WHERE id = :id`,
    {
      id: row.id,
      fullName,
      schoolName,
      division,
      rollNumber,
      standard,
    }
  );

  console.log(
    `Refreshed ${row.certificate_code}: school="${schoolName}", name="${fullName}"`
  );

  const result = await sendCertificateEmail(
    {
      id: row.id,
      userId: row.user_id,
      programId: row.program_id,
      certificateCode: row.certificate_code,
      fullName,
      schoolName,
      division,
      rollNumber,
      standard,
      programHeading: row.program_heading,
      issuedAt: row.issued_at,
      email: user.email,
    },
    row.program_slug
  );

  if (result.ok) {
    console.log('SENT OK');
  } else {
    failed += 1;
    console.error('FAIL:', result.error || result);
  }
}

await pool.end();
process.exit(failed ? 1 : 0);
