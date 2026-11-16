import { escapeHtml, renderMailLayout, renderPrimaryButton } from './mailLayout.js';

export function buildPasswordResetEmail({ firstName, resetUrl, expiresMinutes }) {
  const name = escapeHtml(firstName || 'Student');
  const minutes = Number(expiresMinutes) || 60;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Hello ${name},
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      We received a request to reset your Bharat Garv password. Use the button below to choose a new password.
      This link expires in <strong>${minutes} minutes</strong> and can be used only once.
    </p>
    ${renderPrimaryButton({ href: resetUrl, label: 'Reset password' })}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${escapeHtml(resetUrl)}" style="color:#6B204D;word-break:break-all;">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
      If you did not request a password reset, no action is needed. Your password will stay the same.
    </p>
  `;

  return {
    subject: 'Reset your Bharat Garv password',
    html: renderMailLayout({
      title: 'Password reset',
      preheader: 'Reset your Bharat Garv password securely.',
      bodyHtml,
    }),
    text: [
      `Hello ${firstName || 'Student'},`,
      '',
      'We received a request to reset your Bharat Garv password.',
      `Open this link within ${minutes} minutes to choose a new password:`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  };
}
