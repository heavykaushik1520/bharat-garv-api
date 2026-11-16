import ExcelJS from 'exceljs';
import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';
import { normalizeSchoolText } from '../utils/schoolLabel.js';
import { schoolNameSchema, schoolWardSchema } from '../validators/schoolValidators.js';

const MAX_IMPORT_ROWS = 5000;
const CHUNK_SIZE = 250;

const NAME_ALIASES = new Set([
  'school name',
  'school_name',
  'schoolname',
  'name',
  'school',
]);
const WARD_ALIASES = new Set(['ward', 'ward name', 'ward_name', 'wardname']);

function cellToString(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    if (value.text != null) return String(value.text);
    if (value.result != null) return String(value.result);
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('');
    }
  }
  return String(value);
}

function normalizeHeader(value) {
  return normalizeSchoolText(cellToString(value)).toLowerCase();
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsvBuffer(buffer) {
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  return lines.map((line) => parseCsvLine(line));
}

async function parseXlsxBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS accepts Buffer in Node.
  // eslint-disable-next-line no-undef
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values.map((cell) => cellToString(cell)));
  });
  return rows;
}

function mapHeaderIndexes(headerRow) {
  const nameIndex = headerRow.findIndex((cell) => NAME_ALIASES.has(normalizeHeader(cell)));
  const wardIndex = headerRow.findIndex((cell) => WARD_ALIASES.has(normalizeHeader(cell)));

  if (nameIndex < 0 || wardIndex < 0) {
    throw httpError(
      'Invalid template headers. Required columns: school name, ward',
      400,
      [
        {
          field: 'file',
          message: 'Use headers exactly as in the downloadable template: school name, ward',
        },
      ]
    );
  }

  return { nameIndex, wardIndex };
}

function validateRow(nameRaw, wardRaw, rowNumber) {
  const nameResult = schoolNameSchema.safeParse(nameRaw);
  const wardResult = schoolWardSchema.safeParse(wardRaw);

  if (!nameResult.success || !wardResult.success) {
    const messages = [
      ...(nameResult.success
        ? []
        : nameResult.error.issues.map((issue) => issue.message)),
      ...(wardResult.success
        ? []
        : wardResult.error.issues.map((issue) => issue.message)),
    ];
    return {
      ok: false,
      rowNumber,
      message: messages[0] || 'Invalid row',
    };
  }

  return {
    ok: true,
    rowNumber,
    name: nameResult.data,
    ward: wardResult.data,
  };
}

/**
 * Parse uploaded school import file into validated rows.
 */
export async function parseSchoolImportFile(file) {
  if (!file?.buffer?.length) {
    throw httpError('Upload file is required', 400, [
      { field: 'file', message: 'Upload an .xlsx or .csv file' },
    ]);
  }

  const ext = String(file.originalname || '')
    .toLowerCase()
    .split('.')
    .pop();

  const matrix =
    ext === 'csv' ? parseCsvBuffer(file.buffer) : await parseXlsxBuffer(file.buffer);

  if (!matrix.length) {
    throw httpError('The file is empty', 400, [
      { field: 'file', message: 'The file has no rows' },
    ]);
  }

  const { nameIndex, wardIndex } = mapHeaderIndexes(matrix[0]);
  const dataRows = matrix.slice(1);

  if (!dataRows.length) {
    throw httpError('The file has headers but no school rows', 400, [
      { field: 'file', message: 'Add at least one school row' },
    ]);
  }

  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw httpError(`Too many rows. Maximum allowed is ${MAX_IMPORT_ROWS}`, 400, [
      { field: 'file', message: `Limit is ${MAX_IMPORT_ROWS} data rows per upload` },
    ]);
  }

  const valid = [];
  const invalid = [];
  const seen = new Map();

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const nameRaw = row[nameIndex];
    const wardRaw = row[wardIndex];

    // Skip completely blank lines
    if (!normalizeSchoolText(nameRaw) && !normalizeSchoolText(wardRaw)) {
      return;
    }

    const parsed = validateRow(nameRaw, wardRaw, rowNumber);
    if (!parsed.ok) {
      invalid.push(parsed);
      return;
    }

    const key = `${parsed.name.toLowerCase()}::${parsed.ward.toLowerCase()}`;
    if (seen.has(key)) {
      invalid.push({
        ok: false,
        rowNumber,
        message: `Duplicate of row ${seen.get(key)} in this file`,
      });
      return;
    }

    seen.set(key, rowNumber);
    valid.push(parsed);
  });

  return { valid, invalid, totalDataRows: dataRows.length };
}

/**
 * Upsert validated school rows in chunks. Safe under concurrent imports.
 */
export async function importSchools(validRows) {
  let created = 0;
  let restored = 0;
  let skippedExisting = 0;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);

      for (const row of chunk) {
        const [existing] = await connection.query(
          `SELECT id, is_active
           FROM schools
           WHERE name = :name AND ward = :ward
           LIMIT 1
           FOR UPDATE`,
          { name: row.name, ward: row.ward }
        );

        if (existing.length) {
          if (!existing[0].is_active) {
            await connection.query(
              `UPDATE schools
               SET is_active = 1
               WHERE id = :id`,
              { id: existing[0].id }
            );
            restored += 1;
          } else {
            skippedExisting += 1;
          }
          continue;
        }

        try {
          await connection.query(
            `INSERT INTO schools (name, ward, city, is_active)
             VALUES (:name, :ward, NULL, 1)`,
            { name: row.name, ward: row.ward }
          );
          created += 1;
        } catch (error) {
          if (error?.code === 'ER_DUP_ENTRY') {
            skippedExisting += 1;
            continue;
          }
          throw error;
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { created, restored, skippedExisting };
}

export async function buildSchoolImportTemplate(format = 'xlsx') {
  if (format === 'csv') {
    const csv = 'school name,ward\n"Example High School","Ward 1"\n';
    return {
      buffer: Buffer.from(csv, 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'bharat-garv-schools-template.csv',
    };
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bharat Garv';
  const sheet = workbook.addWorksheet('Schools');
  sheet.columns = [
    { header: 'school name', key: 'name', width: 40 },
    { header: 'ward', key: 'ward', width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({ name: 'Example High School', ward: 'Ward 1' });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'bharat-garv-schools-template.xlsx',
  };
}
