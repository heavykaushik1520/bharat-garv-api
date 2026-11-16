import crypto from 'crypto';
import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';
import { buildParticipationCertificatePdf } from './certificatePdfService.js';
import { sendAppMail } from './mailService.js';
import { escapeHtml, renderMailLayout } from '../templates/mailLayout.js';

function mapCertificate(row) {
  if (!row) return null;
  return {
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
    emailedAt: row.emailed_at || null,
    createdAt: row.created_at,
  };
}

function generateCertificateCode() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BG-${stamp}-${random}`;
}

/** MySQL DATETIME wall-clock in Asia/Kolkata (certificate date for students). */
function toMysqlDateTimeIst(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

async function listRequiredSectionIds(programId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT s.id
     FROM program_sections s
     WHERE s.program_id = :programId
       AND s.is_active = 1
       AND EXISTS (
         SELECT 1
         FROM program_questions q
         WHERE q.section_id = s.id
           AND q.is_active = 1
       )
     ORDER BY s.sort_order ASC, s.id ASC`,
    { programId }
  );
  return rows.map((row) => Number(row.id));
}

export async function hasCompletedAllSections(userId, programId, connection = pool) {
  const sectionIds = await listRequiredSectionIds(programId, connection);
  if (!sectionIds.length) return false;

  const placeholders = sectionIds.map((_, index) => `:sid${index}`).join(', ');
  const params = Object.fromEntries(sectionIds.map((id, index) => [`sid${index}`, id]));

  const [rows] = await connection.query(
    `SELECT COUNT(DISTINCT section_id) AS submittedCount
     FROM program_section_submissions
     WHERE user_id = :userId
       AND section_id IN (${placeholders})`,
    { userId, ...params }
  );

  return Number(rows[0]?.submittedCount || 0) >= sectionIds.length;
}

export async function getCertificateForUserProgram(userId, programId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT *
     FROM program_certificates
     WHERE user_id = :userId AND program_id = :programId
     LIMIT 1`,
    { userId, programId }
  );
  return mapCertificate(rows[0]);
}

async function loadRecipientSnapshot(userId, program, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
       u.id,
       u.email,
       u.first_name,
       u.last_name,
       u.standard,
       u.division,
       u.roll_number,
       s.name AS school_name,
       s.ward AS school_ward
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.id = :userId AND u.is_active = 1
     LIMIT 1`,
    { userId }
  );

  const user = rows[0];
  if (!user) {
    throw httpError('Account not found or deactivated', 404);
  }

  const schoolName = user.school_ward
    ? `${user.school_name} · ${user.school_ward}`
    : user.school_name;

  return {
    email: user.email,
    fullName: `${user.first_name} ${user.last_name}`.trim(),
    schoolName,
    division: String(user.division || '').toUpperCase().slice(0, 1) || 'A',
    rollNumber: String(user.roll_number || ''),
    standard: Number(user.standard),
    programHeading: program.heading_en || program.headingEn || 'Bharat Garv Competition',
  };
}

function buildCertificateEmail(certificate) {
  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Hello ${escapeHtml(certificate.fullName.split(' ')[0] || 'Student')},
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Congratulations! You have completed <strong>${escapeHtml(certificate.programHeading)}</strong>.
      Your <strong>Certificate of Participation</strong> is attached to this email as a PDF.
    </p>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#374151;">
      School: ${escapeHtml(certificate.schoolName)}<br/>
      Standard: ${escapeHtml(String(certificate.standard))}
      &nbsp;·&nbsp; Division: ${escapeHtml(certificate.division)}
      &nbsp;·&nbsp; Roll No: ${escapeHtml(certificate.rollNumber)}
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#6b7280;">
      Certificate ID: <strong>${escapeHtml(certificate.certificateCode)}</strong>
    </p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#4b5563;font-style:italic;">
      Your participation reflects your curiosity and enthusiasm for learning about Mumbai’s rich history,
      heritage and cultural legacy. Keep exploring, keep learning and take pride in our heritage!
    </p>
  `;

  return {
    subject: `Your Certificate of Participation — ${certificate.programHeading}`,
    html: renderMailLayout({
      title: 'Certificate of Participation',
      preheader: 'Your Bharat Garv certificate PDF is attached.',
      bodyHtml,
    }),
    text: [
      `Hello ${certificate.fullName},`,
      '',
      `Congratulations! You completed ${certificate.programHeading}.`,
      'Your Certificate of Participation is attached as a PDF.',
      '',
      `School: ${certificate.schoolName}`,
      `Standard: ${certificate.standard} · Division: ${certificate.division} · Roll No: ${certificate.rollNumber}`,
      `Certificate ID: ${certificate.certificateCode}`,
      '',
      "Your participation reflects your curiosity and enthusiasm for learning about Mumbai's rich history, heritage and cultural legacy. Keep exploring, keep learning and take pride in our heritage!",
    ].join('\n'),
  };
}

async function markCertificateEmailed(certificateId) {
  if (!certificateId) return;
  await pool.query(
    `UPDATE program_certificates
     SET emailed_at = :emailedAt
     WHERE id = :id AND emailed_at IS NULL`,
    { id: certificateId, emailedAt: toMysqlDateTimeIst() }
  );
}

/**
 * Deliver certificate PDF by email. Marks emailed_at only after SMTP success.
 */
export async function sendCertificateEmail(certificate, programSlug = null) {
  if (!certificate?.email) {
    return { ok: false, error: 'Student email is missing' };
  }

  const mail = buildCertificateEmail(certificate);
  const pdf = await buildParticipationCertificatePdf(certificate);
  const result = await sendAppMail({
    mailType: 'certificate',
    to: certificate.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: {
      userId: certificate.userId,
      programId: certificate.programId,
      certificateCode: certificate.certificateCode,
      programSlug: programSlug || null,
    },
    attachments: [
      {
        filename: `Bharat-Garv-Certificate-${certificate.certificateCode}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  if (result.ok) {
    await markCertificateEmailed(certificate.id);
  }

  return result;
}

/**
 * Issue a participation certificate once all required sections are submitted.
 * Delivers the PDF by email (primary channel). Retries if a prior send failed.
 * Safe under concurrency via UNIQUE(user_id, program_id).
 */
export async function issueCertificateIfProgramComplete({
  userId,
  program,
  programSlug = null,
  sendEmail = true,
}) {
  if (!userId || !program?.id) {
    return {
      issued: false,
      newlyIssued: false,
      emailed: false,
      certificate: null,
    };
  }

  const existing = await getCertificateForUserProgram(userId, program.id);
  if (existing) {
    let emailed = Boolean(existing.emailedAt);
    if (sendEmail && !emailed) {
      const snapshot = await loadRecipientSnapshot(userId, program);
      const mailResult = await sendCertificateEmail(
        { ...existing, email: snapshot.email },
        programSlug || program.slug
      );
      emailed = Boolean(mailResult.ok);
      if (emailed) {
        existing.emailedAt = new Date();
      }
    }
    return {
      issued: true,
      newlyIssued: false,
      emailed,
      certificate: existing,
    };
  }

  const complete = await hasCompletedAllSections(userId, program.id);
  if (!complete) {
    return {
      issued: false,
      newlyIssued: false,
      emailed: false,
      certificate: null,
    };
  }

  const snapshot = await loadRecipientSnapshot(userId, program);
  const issuedAt = new Date();
  const issuedMysql = toMysqlDateTimeIst(issuedAt);

  let certificate = null;
  let newlyIssued = false;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const certificateCode = generateCertificateCode();
    try {
      const [result] = await pool.query(
        `INSERT INTO program_certificates (
           user_id, program_id, certificate_code, full_name, school_name,
           division, roll_number, standard, program_heading, issued_at
         ) VALUES (
           :userId, :programId, :certificateCode, :fullName, :schoolName,
           :division, :rollNumber, :standard, :programHeading, :issuedAt
         )`,
        {
          userId,
          programId: program.id,
          certificateCode,
          fullName: snapshot.fullName,
          schoolName: snapshot.schoolName,
          division: snapshot.division,
          rollNumber: snapshot.rollNumber,
          standard: snapshot.standard,
          programHeading: snapshot.programHeading,
          issuedAt: issuedMysql,
        }
      );

      certificate = {
        id: result.insertId,
        userId,
        programId: program.id,
        certificateCode,
        fullName: snapshot.fullName,
        schoolName: snapshot.schoolName,
        division: snapshot.division,
        rollNumber: snapshot.rollNumber,
        standard: snapshot.standard,
        programHeading: snapshot.programHeading,
        issuedAt,
        emailedAt: null,
        email: snapshot.email,
      };
      newlyIssued = true;
      break;
    } catch (error) {
      // Race: another request inserted first, or rare code collision.
      if (error?.code === 'ER_DUP_ENTRY') {
        const raced = await getCertificateForUserProgram(userId, program.id);
        if (raced) {
          certificate = raced;
          newlyIssued = false;
          break;
        }
        continue;
      }
      throw error;
    }
  }

  if (!certificate) {
    throw httpError('Could not issue certificate. Please try again.', 500);
  }

  let emailed = Boolean(certificate.emailedAt);
  if (sendEmail && !emailed) {
    const mailResult = await sendCertificateEmail(
      { ...certificate, email: snapshot.email },
      programSlug || program.slug
    );
    emailed = Boolean(mailResult.ok);
    if (emailed) {
      certificate.emailedAt = new Date();
    }
  }

  return { issued: true, newlyIssued, emailed, certificate };
}

export async function requireCertificateForUserProgram(userId, programId) {
  const certificate = await getCertificateForUserProgram(userId, programId);
  if (!certificate) {
    throw httpError(
      'Certificate is not available yet. Complete all sections of the programme first.',
      404,
      [{ field: 'certificate', message: 'Complete all sections to unlock your certificate' }]
    );
  }
  return certificate;
}

export async function buildCertificatePdfForUserProgram(userId, programId) {
  const certificate = await requireCertificateForUserProgram(userId, programId);
  const pdf = await buildParticipationCertificatePdf(certificate);
  return { certificate, pdf };
}

/** Public payload for students — email is the delivery channel, not the website. */
export function toPublicCertificate(certificate) {
  if (!certificate) return null;
  return {
    issued: true,
    emailed: Boolean(certificate.emailedAt),
    certificateCode: certificate.certificateCode,
    programHeading: certificate.programHeading,
    issuedAt: certificate.issuedAt,
    emailedAt: certificate.emailedAt || null,
  };
}
