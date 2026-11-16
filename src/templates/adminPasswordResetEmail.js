import { escapeHtml, renderMailLayout, renderPrimaryButton } from './mailLayout.js';

export function buildAdminPasswordResetEmail({ name, resetUrl, expiresMinutes }) {
  const safeName = escapeHtml(name || 'Admin');
  const minutes = Number(expiresMinutes) || 60;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Hello ${safeName},
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      We received a request to reset your Bharat Garv <strong>admin</strong> password.
      Use the button below to choose a new password. This link expires in
      <strong>${minutes} minutes</strong> and can be used only once.
    </p>
    ${renderPrimaryButton({ href: resetUrl, label: 'Reset admin password' })}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${escapeHtml(resetUrl)}" style="color:#6B204D;word-break:break-all;">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
      If you did not request this, you can ignore this email. Your password will stay the same.
    </p>
  `;

  return {
    subject: 'Reset your Bharat Garv admin password',
    html: renderMailLayout({
      title: 'Admin password reset',
      preheader: 'Reset your Bharat Garv admin password securely.',
      bodyHtml,
    }),
    text: [
      `Hello ${name || 'Admin'},`,
      '',
      'We received a request to reset your Bharat Garv admin password.',
      `Open this link within ${minutes} minutes to choose a new password:`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  };
}
