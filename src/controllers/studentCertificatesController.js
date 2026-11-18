import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildCertificatePdfForUserProgram,
  listCertificatesForUser,
  regenerateCertificateForUserProgram,
  toPublicCertificate,
} from '../services/certificateService.js';

function sendCertificatePdf(res, certificate, pdf) {
  const filename = `Bharat-Garv-Certificate-${certificate.certificateCode}.pdf`;
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': pdf.length,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Certificate-Code': certificate.certificateCode,
  });
  res.send(pdf);
}

export const listMyCertificates = asyncHandler(async (req, res) => {
  const { limit } = req.validated.query;
  const certificates = await listCertificatesForUser(req.user.id, { limit });

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: certificates.map((item) => toPublicCertificate(item)),
    meta: {
      count: certificates.length,
      limit,
    },
  });
});

export const downloadMyCertificate = asyncHandler(async (req, res) => {
  const { programId } = req.validated.params;
  const { certificate, pdf } = await buildCertificatePdfForUserProgram(
    req.user.id,
    programId
  );
  sendCertificatePdf(res, certificate, pdf);
});

export const regenerateMyCertificate = asyncHandler(async (req, res) => {
  const { programId } = req.validated.params;
  const { certificate, pdf } = await regenerateCertificateForUserProgram(
    req.user.id,
    programId
  );
  sendCertificatePdf(res, certificate, pdf);
});
