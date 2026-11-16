import 'dotenv/config';
import { getMailTransporter, mailConfig } from '../src/config/mail.js';

console.log('SMTP host:', mailConfig.host);
console.log('SMTP port:', mailConfig.port);
console.log('SMTP user:', mailConfig.user);
console.log('SMTP pass set:', Boolean(mailConfig.pass), `(len=${mailConfig.pass.length})`);

try {
  const transporter = getMailTransporter();
  await transporter.verify();
  console.log('SMTP verify: OK');
} catch (error) {
  console.error('SMTP verify FAILED:', error.message);
  process.exitCode = 1;
}
