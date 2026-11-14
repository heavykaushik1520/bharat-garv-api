import ExcelJS from 'exceljs';
import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';

/** Hard cap keeps memory, DB load, and response time bounded under traffic. */
export const MAX_STUDENT_EXPORT_ROWS = 50_000;
export const STUDENT_EXPORT_BATCH_SIZE = 1_000;

const LANGUAGE_LABELS = Object.freeze({
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
});

const EXPORT_COLUMNS = Object.freeze([
  { key: 'firstName', header: 'First Name', width: 18 },
  { key: 'lastName', header: 'Last Name', width: 18 },
  { key: 'fullName', header: 'Full Name', width: 28 },
  { key: 'email', header: 'Email', width: 32 },
  { key: 'phone', header: 'Phone', width: 16 },
  { key: 'schoolName', header: 'School', width: 36 },
  { key: 'standard', header: 'Standard', width: 12 },
  { key: 'division', header: 'Division', width: 12 },
  { key: 'rollNumber', header: 'Roll Number', width: 14 },
  { key: 'preferredLanguage', header: 'Language', width: 14 },
]);

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function mapExportRow(row) {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: `+91${row.phone}`,
    schoolName: row.school_name,
    standard: row.standard,
    division: row.division,
    rollNumber: row.roll_number,
    preferredLanguage: LANGUAGE_LABELS[row.preferred_language] || row.preferred_language,
  };
}

function buildExportFileBase(query) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const parts = ['students', stamp];

  if (query.schoolId) parts.push(`school-${query.schoolId}`);
  if (query.standard) parts.push(`std-${query.standard}`);
  if (query.status && query.status !== 'all') parts.push(query.status);

  return parts.join('_');
}

export function buildStudentExportFilename(query, format) {
  return `${buildExportFileBase(query)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
}

export function getStudentExportContentType(format) {
  return format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv; charset=utf-8';
}

async function countStudentsForExport({ whereSql, params }) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE ${whereSql}`,
    params
  );
  return Number(rows[0]?.total || 0);
}

async function fetchStudentExportBatch({
  whereSql,
  params,
  orderBy,
  offset,
  limit,
}) {
  const [rows] = await pool.query(
    `SELECT
       u.email,
       u.phone,
       u.first_name,
       u.last_name,
       s.name AS school_name,
       u.standard,
       u.division,
       u.roll_number,
       u.preferred_language
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return rows;
}

/**
 * Stream a filtered student export to an HTTP response.
 * Passwords are never selected. Rows are fetched in batches to bound memory.
 */
export async function streamStudentExport({
  res,
  req,
  format,
  whereSql,
  params,
  orderBy,
  query,
}) {
  const total = await countStudentsForExport({ whereSql, params });

  if (total === 0) {
    throw httpError('No students match the current filters', 404);
  }

  if (total > MAX_STUDENT_EXPORT_ROWS) {
    throw httpError(
      `Export is limited to ${MAX_STUDENT_EXPORT_ROWS.toLocaleString('en-IN')} students. Narrow your filters and try again.`,
      400,
      [
        {
          field: 'filters',
          message: `Matched ${total.toLocaleString('en-IN')} students; maximum is ${MAX_STUDENT_EXPORT_ROWS.toLocaleString('en-IN')}.`,
        },
      ]
    );
  }

  const filename = buildStudentExportFilename(query, format);
  const contentType = getStudentExportContentType(format);

  let aborted = false;
  const onClose = () => {
    aborted = true;
  };
  req.on('close', onClose);

  try {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Export-Row-Count', String(total));
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Row-Count');

    if (format === 'csv') {
      await streamCsvExport({
        res,
        whereSql,
        params,
        orderBy,
        total,
        isAborted: () => aborted,
      });
    } else {
      await streamXlsxExport({
        res,
        whereSql,
        params,
        orderBy,
        total,
        isAborted: () => aborted,
      });
    }
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.destroy(error instanceof Error ? error : undefined);
      }
      return { total, filename, aborted: true };
    }
    throw error;
  } finally {
    req.off('close', onClose);
  }

  return { total, filename };
}

async function streamCsvExport({ res, whereSql, params, orderBy, total, isAborted }) {
  // UTF-8 BOM helps Excel detect encoding correctly.
  res.write('\uFEFF');
  res.write(`${EXPORT_COLUMNS.map((column) => csvEscape(column.header)).join(',')}\r\n`);

  for (let offset = 0; offset < total; offset += STUDENT_EXPORT_BATCH_SIZE) {
    if (isAborted()) {
      break;
    }

    const rows = await fetchStudentExportBatch({
      whereSql,
      params,
      orderBy,
      offset,
      limit: STUDENT_EXPORT_BATCH_SIZE,
    });

    if (!rows.length) {
      break;
    }

    let chunk = '';
    for (const row of rows) {
      const mapped = mapExportRow(row);
      chunk += `${EXPORT_COLUMNS.map((column) => csvEscape(mapped[column.key])).join(',')}\r\n`;
    }

    const canContinue = res.write(chunk);
    if (!canContinue) {
      await new Promise((resolve) => res.once('drain', resolve));
    }
  }

  if (!res.writableEnded) {
    res.end();
  }
}

async function streamXlsxExport({ res, whereSql, params, orderBy, total, isAborted }) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: false,
    useSharedStrings: false,
  });

  workbook.creator = 'Bharat Garv Admin';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Students', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = EXPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).commit();

  for (let offset = 0; offset < total; offset += STUDENT_EXPORT_BATCH_SIZE) {
    if (isAborted()) {
      break;
    }

    const rows = await fetchStudentExportBatch({
      whereSql,
      params,
      orderBy,
      offset,
      limit: STUDENT_EXPORT_BATCH_SIZE,
    });

    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      worksheet.addRow(mapExportRow(row)).commit();
    }
  }

  await workbook.commit();
}
