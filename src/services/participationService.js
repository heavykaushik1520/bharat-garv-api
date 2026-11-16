import pool from '../config/db.js';
import { mysqlDateTimeToDateOnly } from '../utils/programSchedule.js';
import { buildParticipationEmail } from '../templates/participationEmail.js';
import { buildAppUrl, queueMail, sendAppMail } from './mailService.js';

function formatDateOnlyLabel(value) {
  const day = mysqlDateTimeToDateOnly(value);
  if (!day) return '';
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Record first participation for (user, program) and email the candidate once.
 * Safe under concurrent requests via UNIQUE key + conditional update.
 */
export async function ensureParticipationAndNotify({
  userId,
  programId,
  programSlug,
  programHeading,
  startsAt,
  endsAt,
  userEmail,
  firstName,
}) {
  if (!userId || !programId) return { created: false, mailed: false };

  const [insertResult] = await pool.query(
    `INSERT INTO program_participations (user_id, program_id, welcome_mail_status)
     VALUES (:userId, :programId, 'pending')
     ON DUPLICATE KEY UPDATE id = id`,
    { userId, programId }
  );

  const created = Number(insertResult.affectedRows || 0) === 1;

  const [rows] = await pool.query(
    `SELECT id, welcome_mail_status
     FROM program_participations
     WHERE user_id = :userId AND program_id = :programId
     LIMIT 1`,
    { userId, programId }
  );

  const participation = rows[0];
  if (!participation || participation.welcome_mail_status !== 'pending') {
    return { created, mailed: false };
  }

  // Claim the send so concurrent program opens don't double-email.
  const [claim] = await pool.query(
    `UPDATE program_participations
     SET welcome_mail_status = 'sending'
     WHERE id = :id AND welcome_mail_status = 'pending'`,
    { id: participation.id }
  );

  if (!Number(claim.affectedRows)) {
    return { created, mailed: false };
  }

  const programUrl = buildAppUrl(`/programs/${encodeURIComponent(programSlug || programId)}`);
  const mail = buildParticipationEmail({
    firstName,
    programHeading,
    programUrl,
    startsOn: formatDateOnlyLabel(startsAt),
    endsOn: formatDateOnlyLabel(endsAt),
  });

  queueMail(async () => {
    const result = await sendAppMail({
      mailType: 'participation',
      to: userEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { userId, programId },
    });

    await pool.query(
      `UPDATE program_participations
       SET welcome_mail_status = :status,
           welcome_mail_sent_at = CASE WHEN :status = 'sent' THEN UTC_TIMESTAMP() ELSE NULL END
       WHERE id = :id`,
      {
        id: participation.id,
        status: result.ok ? 'sent' : 'failed',
      }
    );
  });

  return { created, mailed: true };
}
