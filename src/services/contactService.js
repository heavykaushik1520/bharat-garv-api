import { mailConfig } from '../config/mail.js';
import { httpError } from '../utils/httpError.js';
import { escapeHtml, renderMailLayout } from '../templates/mailLayout.js';
import { sendAppMail } from './mailService.js';

function buildContactAdminEmail(payload) {
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const receivedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      A new contact form message was submitted on Bharat Garv.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;color:#374151;">
      <tr>
        <td style="padding:6px 0;width:120px;color:#6b7280;">Name</td>
        <td style="padding:6px 0;font-weight:600;">${escapeHtml(fullName)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Email</td>
        <td style="padding:6px 0;">
          <a href="mailto:${escapeHtml(payload.email)}" style="color:#6B204D;text-decoration:none;">
            ${escapeHtml(payload.email)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Subject</td>
        <td style="padding:6px 0;font-weight:600;">${escapeHtml(payload.subject)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Received</td>
        <td style="padding:6px 0;">${escapeHtml(receivedAt)} IST</td>
      </tr>
    </table>
    <div style="margin:18px 0 0;padding:16px 18px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;font-weight:700;">
        Message
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#111827;white-space:pre-wrap;">
        ${escapeHtml(payload.message)}
      </p>
    </div>
  `;

  return {
    subject: `Contact form — ${payload.subject}`,
    html: renderMailLayout({
      title: 'New contact message',
      preheader: `${fullName}: ${payload.subject}`,
      bodyHtml,
    }),
    text: [
      'New Bharat Garv contact form message',
      '',
      `Name: ${fullName}`,
      `Email: ${payload.email}`,
      `Subject: ${payload.subject}`,
      `Received: ${receivedAt} IST`,
      '',
      'Message:',
      payload.message,
    ].join('\n'),
  };
}

/**
 * Send contact-form message to ADMIN_NOTIFY_EMAIL via the shared SMTP transporter.
 */
export async function sendContactFormToAdmin(payload) {
  const adminEmail = String(mailConfig.adminNotifyEmail || '')
    .trim()
    .toLowerCase();

  if (!adminEmail) {
    throw httpError('Admin notification email is not configured', 500);
  }

  const mail = buildContactAdminEmail(payload);
  const result = await sendAppMail({
    mailType: 'contact',
    to: adminEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    replyTo: payload.email,
    meta: {
      fromEmail: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      subject: payload.subject,
    },
    throwOnError: false,
  });

  if (!result.ok) {
    throw httpError(
      'Could not send your message right now. Please try again in a moment.',
      502,
      [{ field: 'email', message: result.error || 'SMTP delivery failed' }]
    );
  }

  return { ok: true, adminEmail };
}
