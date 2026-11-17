import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildParticipationCertificatePdf } from '../src/services/certificatePdfService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(
  __dirname,
  '../assets/certificates/participation-preview.pdf'
);

const pdf = await buildParticipationCertificatePdf({
  fullName: 'Pushkar Sabnis',
  schoolName: 'Saraswati Secondary School, Thane',
  standard: 5,
  division: 'A',
  programHeading: 'Ancient Wonders Of Mumbai',
  issuedAt: new Date('2027-01-01T10:00:00+05:30'),
  certificateCode: 'BG-PREVIEW-001',
});

fs.writeFileSync(outPath, pdf);
console.log(`Wrote ${outPath} (${pdf.length} bytes)`);
