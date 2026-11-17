import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { httpError } from '../utils/httpError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../assets/certificates/participation-template.png'
);
const FONTS_DIR = path.resolve(__dirname, '../../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'AnekDevanagari-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'AnekDevanagari-Bold.ttf');

const NAME_COLOR = '#6f1e4f';
const STATIC_COLOR = '#938a8d';
const DYNAMIC_COLOR = '#5d5058';

const FONT_REGULAR_NAME = 'AnekDevanagari';
const FONT_BOLD_NAME = 'AnekDevanagari-Bold';

/** A4 landscape points */
const PAGE = { width: 841.89, height: 595.28 };

/**
 * Layout calibrated from sample-certificate.png (3508×2481) → A4 landscape.
 *
 * Sample ink bounds (px):
 *   date  (2712,377)–(3133,417)
 *   name  (891,1165)–(2615,1297)
 *   line  y≈1310
 *   body  y≈1405
 */
const SX = PAGE.width / 3508;
const SY = PAGE.height / 2481;
const LAYOUT = {
  date: {
    x: 2712 * SX,
    y: 377 * SY,
    width: (3133 - 2712) * SX,
    fontSize: 11,
  },
  name: {
    y: 1165 * SY,
    maxWidth: 640,
    fontSize: 32,
  },
  body: {
    y: 1405 * SY,
    maxWidth: 560,
    fontSize: 13.5,
    lineGap: 5,
  },
};

let cachedTemplate = null;
let fontsRegistered = false;

function getTemplateBuffer() {
  if (cachedTemplate) return cachedTemplate;
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw httpError(
      'Certificate template is missing on the server. Please contact support.',
      500
    );
  }
  cachedTemplate = fs.readFileSync(TEMPLATE_PATH);
  return cachedTemplate;
}

function ensureFonts(doc) {
  if (!fontsRegistered) {
    if (!fs.existsSync(FONT_REGULAR) || !fs.existsSync(FONT_BOLD)) {
      throw httpError(
        'Certificate fonts are missing on the server. Please contact support.',
        500
      );
    }
    fontsRegistered = true;
  }
  doc.registerFont(FONT_REGULAR_NAME, FONT_REGULAR);
  doc.registerFont(FONT_BOLD_NAME, FONT_BOLD);
}

function fontFor(bold) {
  return bold ? FONT_BOLD_NAME : FONT_REGULAR_NAME;
}

function colorFor(bold) {
  return bold ? DYNAMIC_COLOR : STATIC_COLOR;
}

function asDate(value) {
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayOrdinal(day) {
  const n = Number(day);
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatCertificateIssuedDate(value) {
  const date = asDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')} ${dayOrdinal(get('day'))} ${get('year')}`;
}

export function formatCertificateGrade(standard) {
  const n = Number(standard);
  if (!Number.isFinite(n) || n < 1) return String(standard ?? '');
  return dayOrdinal(n);
}

function cleanText(value, maxLen = 180) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function assertCertificatePayload(certificate) {
  if (!certificate || typeof certificate !== 'object') {
    throw httpError('Invalid certificate payload', 500);
  }
  const required = ['fullName', 'schoolName', 'division', 'standard', 'programHeading'];
  for (const key of required) {
    if (!cleanText(certificate[key])) {
      throw httpError(`Certificate field missing: ${key}`, 500);
    }
  }
}

function measureRichLine(doc, segments, fontSize) {
  let width = 0;
  for (const part of segments) {
    doc.font(fontFor(part.bold)).fontSize(fontSize);
    width += doc.widthOfString(part.text);
  }
  return width;
}

function wrapRichText(doc, segments, maxWidth, fontSize) {
  const lines = [];
  let current = [];

  const pushCurrent = () => {
    if (current.length) {
      lines.push(current);
      current = [];
    }
  };

  for (const part of segments) {
    const words = String(part.text).split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      const trial = [...current, { text: word, bold: part.bold }];
      if (measureRichLine(doc, trial, fontSize) <= maxWidth || current.length === 0) {
        current = trial;
      } else {
        pushCurrent();
        current = [{ text: word.replace(/^\s+/, ''), bold: part.bold }].filter(
          (item) => item.text
        );
      }
    }
  }
  pushCurrent();
  return lines;
}

function drawCenteredRichText(doc, segments, startY, { maxWidth, fontSize, lineGap }) {
  const lines = wrapRichText(doc, segments, maxWidth, fontSize);
  let y = startY;

  for (const line of lines) {
    const lineWidth = measureRichLine(doc, line, fontSize);
    let x = (PAGE.width - lineWidth) / 2;
    for (const part of line) {
      doc
        .font(fontFor(part.bold))
        .fontSize(fontSize)
        .fillColor(colorFor(part.bold))
        .text(part.text, x, y, { lineBreak: false });
      x += doc.widthOfString(part.text);
    }
    y += fontSize + lineGap;
  }

  return y;
}

function buildBodySegments(certificate) {
  const schoolName = cleanText(certificate.schoolName, 140);
  const grade = formatCertificateGrade(certificate.standard);
  const division = cleanText(certificate.division, 8).toUpperCase();
  const programName = cleanText(certificate.programHeading, 120);

  return [
    { text: 'student of ', bold: false },
    { text: schoolName, bold: true },
    { text: ', Grade: ', bold: false },
    { text: grade, bold: true },
    { text: ', Division: ', bold: false },
    { text: division, bold: true },
    {
      text: ` for participating in the “${programName}” Competition organised under the Bharat Garv Initiative on the occasion of World Heritage Week 2026.`,
      bold: false,
    },
  ];
}

/**
 * Build a landscape A4 participation certificate PDF from the designer PNG template.
 * Dynamic overlays: issued date, full name, participation paragraph.
 */
export function buildParticipationCertificatePdf(certificate) {
  assertCertificatePayload(certificate);
  const template = getTemplateBuffer();
  const fullName = cleanText(certificate.fullName, 80).toUpperCase();
  const issuedLabel = formatCertificateIssuedDate(certificate.issuedAt);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Certificate of Participation — ${cleanText(certificate.programHeading, 120)}`,
        Author: 'Bharat Garv',
        Subject: 'Certificate of Participation',
        Creator: 'Bharat Garv Platform',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      ensureFonts(doc);

      doc.image(template, 0, 0, {
        width: PAGE.width,
        height: PAGE.height,
      });

      if (issuedLabel) {
        doc
          .font(FONT_REGULAR_NAME)
          .fontSize(LAYOUT.date.fontSize)
          .fillColor(STATIC_COLOR)
          .text(issuedLabel, LAYOUT.date.x, LAYOUT.date.y, {
            width: LAYOUT.date.width,
            align: 'right',
            lineBreak: false,
          });
      }

      doc
        .font(FONT_BOLD_NAME)
        .fontSize(LAYOUT.name.fontSize)
        .fillColor(NAME_COLOR)
        .text(fullName, (PAGE.width - LAYOUT.name.maxWidth) / 2, LAYOUT.name.y, {
          width: LAYOUT.name.maxWidth,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        });

      drawCenteredRichText(doc, buildBodySegments(certificate), LAYOUT.body.y, {
        maxWidth: LAYOUT.body.maxWidth,
        fontSize: LAYOUT.body.fontSize,
        lineGap: LAYOUT.body.lineGap,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/** Test helper / ops: clear in-memory template cache after replacing the PNG. */
export function clearCertificateTemplateCache() {
  cachedTemplate = null;
}
