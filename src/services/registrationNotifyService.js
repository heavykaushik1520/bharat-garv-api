import { buildRegistrationAdminEmail } from '../templates/registrationAdminEmail.js';
import { mailConfig, queueMail, sendAppMail } from './mailService.js';

export function queueAdminRegistrationEmail(candidate) {
  queueMail(async () => {
    const registeredAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mail = buildRegistrationAdminEmail({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      schoolName: candidate.schoolName,
      standard: candidate.standard,
      division: candidate.division,
      rollNumber: candidate.rollNumber,
      preferredLanguage: candidate.preferredLanguage,
      registeredAt,
    });

    await sendAppMail({
      mailType: 'registration_admin',
      to: mailConfig.adminNotifyEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { userId: candidate.id, email: candidate.email },
    });
  });
}
