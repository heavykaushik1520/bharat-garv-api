import { escapeHtml, renderMailLayout, renderPrimaryButton } from './mailLayout.js';

export function buildParticipationEmail({
  firstName,
  programHeading,
  programUrl,
  startsOn,
  endsOn,
}) {
  const name = escapeHtml(firstName || 'Student');
  const program = escapeHtml(programHeading || 'the competition');

  const scheduleLine =
    startsOn && endsOn
      ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
          Programme window: <strong>${escapeHtml(startsOn)}</strong> to <strong>${escapeHtml(endsOn)}</strong>.
        </p>`
      : '';

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Hello ${name},
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
      Thank you for participating in <strong>${program}</strong>. Watch each learning video fully, then answer the quiz for that section.
    </p>
    ${scheduleLine}
    ${renderPrimaryButton({ href: programUrl, label: 'Continue to programme' })}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
      Tip: keep a stable internet connection and attempt the competition independently.
    </p>
  `;

  return {
    subject: `You’re in — ${programHeading || 'Bharat Garv competition'}`,
    html: renderMailLayout({
      title: 'Participation confirmed',
      preheader: `You have joined ${programHeading || 'the Bharat Garv competition'}.`,
      bodyHtml,
    }),
    text: [
      `Hello ${firstName || 'Student'},`,
      '',
      `Thank you for participating in ${programHeading || 'the competition'}.`,
      startsOn && endsOn ? `Programme window: ${startsOn} to ${endsOn}.` : '',
      '',
      `Continue here: ${programUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
