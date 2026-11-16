import PDFDocument from 'pdfkit';

function formatIssuedDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Build a landscape A4 participation certificate PDF buffer.
 */
export function buildParticipationCertificatePdf(certificate) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      info: {
        Title: `Certificate of Participation — ${certificate.programHeading}`,
        Author: 'Bharat Garv',
        Subject: 'Certificate of Participation',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 28;

    // Outer frame
    doc
      .lineWidth(2.2)
      .strokeColor('#6B204D')
      .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
      .stroke();

    doc
      .lineWidth(0.8)
      .strokeColor('#C49C23')
      .rect(margin + 8, margin + 8, pageWidth - (margin + 8) * 2, pageHeight - (margin + 8) * 2)
      .stroke();

    const centerX = pageWidth / 2;
    let y = margin + 42;

    doc
      .fillColor('#6B204D')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('BHARAT GARV', margin + 40, y, { align: 'center', width: pageWidth - 80 });

    y += 28;
    doc
      .fillColor('#C49C23')
      .font('Helvetica-Bold')
      .fontSize(28)
      .text('Certificate of Participation', margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
      });

    y += 48;
    doc
      .fillColor('#4b5563')
      .font('Helvetica')
      .fontSize(13)
      .text('This certificate is proudly presented to', margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
      });

    y += 28;
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(26)
      .text(certificate.fullName, margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
      });

    y += 36;
    doc
      .moveTo(centerX - 160, y)
      .lineTo(centerX + 160, y)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    y += 18;
    doc
      .fillColor('#4b5563')
      .font('Helvetica')
      .fontSize(12)
      .text('for participating in the competition', margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
      });

    y += 24;
    doc
      .fillColor('#6B204D')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(certificate.programHeading, margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
      });

    y += 36;
    const details = [
      `School: ${certificate.schoolName}`,
      `Standard: ${certificate.standard}  ·  Division: ${certificate.division}  ·  Roll No: ${certificate.rollNumber}`,
    ].join('\n');

    doc
      .fillColor('#374151')
      .font('Helvetica')
      .fontSize(11)
      .text(details, margin + 40, y, {
        align: 'center',
        width: pageWidth - 80,
        lineGap: 4,
      });

    y += 48;
    doc
      .fillColor('#4b5563')
      .font('Helvetica-Oblique')
      .fontSize(11)
      .text(
        "Your participation reflects your curiosity and enthusiasm for learning about Mumbai’s rich history, heritage and cultural legacy. Keep exploring, keep learning and take pride in our heritage!",
        margin + 70,
        y,
        {
          align: 'center',
          width: pageWidth - 140,
          lineGap: 3,
        }
      );

    const footerY = pageHeight - margin - 58;
    doc
      .fillColor('#374151')
      .font('Helvetica')
      .fontSize(11)
      .text(`Date: ${formatIssuedDate(certificate.issuedAt)}`, margin + 50, footerY, {
        width: 260,
        align: 'left',
      });

    doc
      .fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(9)
      .text(`Certificate ID: ${certificate.certificateCode}`, margin + 50, footerY + 18, {
        width: pageWidth - 100,
        align: 'left',
      });

    doc
      .fillColor('#6B204D')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Bharat Garv', pageWidth - margin - 220, footerY, {
        width: 170,
        align: 'right',
      });

    doc
      .fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(9)
      .text('Organised with pride', pageWidth - margin - 220, footerY + 16, {
        width: 170,
        align: 'right',
      });

    doc.end();
  });
}
