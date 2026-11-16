import { escapeHtml, renderMailLayout } from './mailLayout.js';

export function buildRegistrationAdminEmail({
  firstName,
  lastName,
  email,
  phone,
  schoolName,
  standard,
  division,
  rollNumber,
  preferredLanguage,
  registeredAt,
}) {
  const rows = [
    ['Name', `${firstName} ${lastName}`],
    ['Email', email],
    ['Phone', phone],
    ['School', schoolName],
    ['Standard', String(standard)],
    ['Division', division],
    ['Roll number', rollNumber],
    ['Language', preferredLanguage],
    ['Registered at', registeredAt],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:36%;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      A new candidate has registered for Bharat Garv.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      ${tableRows}
    </table>
  `;

  return {
    subject: `New candidate registration — ${firstName} ${lastName}`,
    html: renderMailLayout({
      title: 'New candidate registration',
      preheader: `${firstName} ${lastName} just created a Bharat Garv account.`,
      bodyHtml,
    }),
    text: [
      'A new candidate has registered for Bharat Garv.',
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
    ].join('\n'),
  };
}
