import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { buildPagination, escapeLike } from '../utils/sql.js';
import {
  buildSchoolImportTemplate,
  importSchools,
  parseSchoolImportFile,
} from '../services/schoolImportService.js';

const DUPLICATE_MESSAGE = 'A school with this name, ward, and medium already exists';

function mapSchoolRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    ward: row.ward || '',
    medium: row.medium || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    registeredStudents:
      row.registeredStudents == null ? undefined : Number(row.registeredStudents || 0),
    participantStudents:
      row.participantStudents == null ? undefined : Number(row.participantStudents || 0),
  };
}

export const listAdminSchools = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.validated.query;
  const like = `%${escapeLike(search)}%`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM schools
     WHERE is_active = 1
       AND (
         :search = ''
         OR name LIKE :like ESCAPE '\\\\'
         OR ward LIKE :like ESCAPE '\\\\'
         OR medium LIKE :like ESCAPE '\\\\'
       )`,
    { search, like }
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({ page, limit, total });

  const [rows] = await pool.query(
    `SELECT
       s.id,
       s.name,
       s.ward,
       s.medium,
       s.created_at,
       s.updated_at,
       (
         SELECT COUNT(*)
         FROM users u
         WHERE u.school_id = s.id
           AND u.is_active = 1
       ) AS registeredStudents,
       (
         SELECT COUNT(DISTINCT sub.user_id)
         FROM users u
         INNER JOIN program_section_submissions sub
           ON sub.user_id = u.id
         WHERE u.school_id = s.id
           AND u.is_active = 1
       ) AS participantStudents
     FROM schools s
     WHERE s.is_active = 1
       AND (
         :search = ''
         OR s.name LIKE :like ESCAPE '\\\\'
         OR s.ward LIKE :like ESCAPE '\\\\'
         OR s.medium LIKE :like ESCAPE '\\\\'
       )
     ORDER BY s.name ASC, s.ward ASC, s.medium ASC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    { search, like }
  );

  res.json({
    success: true,
    data: rows.map(mapSchoolRow),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
  });
});

export const getAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [rows] = await pool.query(
    `SELECT id, name, ward, medium, created_at, updated_at
     FROM schools
     WHERE id = :id AND is_active = 1
     LIMIT 1`,
    { id }
  );

  if (!rows.length) {
    throw httpError('School not found', 404);
  }

  res.json({
    success: true,
    data: mapSchoolRow(rows[0]),
  });
});

export const createAdminSchool = asyncHandler(async (req, res) => {
  const { name, ward, medium } = req.validated.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id, name, ward, medium, is_active
       FROM schools
       WHERE name = :name AND ward = :ward AND medium = :medium
       LIMIT 1
       FOR UPDATE`,
      { name, ward, medium }
    );

    if (existing.length && existing[0].is_active) {
      throw httpError(DUPLICATE_MESSAGE, 409, [
        { field: 'name', message: DUPLICATE_MESSAGE },
        { field: 'ward', message: DUPLICATE_MESSAGE },
        { field: 'medium', message: DUPLICATE_MESSAGE },
      ]);
    }

    if (existing.length && !existing[0].is_active) {
      await connection.query(
        `UPDATE schools
         SET is_active = 1
         WHERE id = :id`,
        { id: existing[0].id }
      );

      const [restored] = await connection.query(
        `SELECT id, name, ward, medium, created_at, updated_at
         FROM schools
         WHERE id = :id
         LIMIT 1`,
        { id: existing[0].id }
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: 'School restored successfully',
        data: mapSchoolRow(restored[0]),
      });
    }

    const [result] = await connection.query(
      `INSERT INTO schools (name, ward, medium, city, is_active)
       VALUES (:name, :ward, :medium, NULL, 1)`,
      { name, ward, medium }
    );

    const [created] = await connection.query(
      `SELECT id, name, ward, medium, created_at, updated_at
       FROM schools
       WHERE id = :id
       LIMIT 1`,
      { id: result.insertId }
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: mapSchoolRow(created[0]),
    });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw httpError(DUPLICATE_MESSAGE, 409, [
        { field: 'name', message: DUPLICATE_MESSAGE },
        { field: 'ward', message: DUPLICATE_MESSAGE },
        { field: 'medium', message: DUPLICATE_MESSAGE },
      ]);
    }
    throw error;
  } finally {
    connection.release();
  }
});

export const updateAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { name, ward, medium } = req.validated.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [current] = await connection.query(
      `SELECT id, name, ward, medium
       FROM schools
       WHERE id = :id AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { id }
    );

    if (!current.length) {
      throw httpError('School not found', 404);
    }

    const [duplicate] = await connection.query(
      `SELECT id
       FROM schools
       WHERE name = :name AND ward = :ward AND medium = :medium AND id <> :id
       LIMIT 1`,
      { name, ward, medium, id }
    );

    if (duplicate.length) {
      throw httpError(DUPLICATE_MESSAGE, 409, [
        { field: 'name', message: DUPLICATE_MESSAGE },
        { field: 'ward', message: DUPLICATE_MESSAGE },
        { field: 'medium', message: DUPLICATE_MESSAGE },
      ]);
    }

    await connection.query(
      `UPDATE schools
       SET name = :name, ward = :ward, medium = :medium
       WHERE id = :id AND is_active = 1`,
      { name, ward, medium, id }
    );

    const [updated] = await connection.query(
      `SELECT id, name, ward, medium, created_at, updated_at
       FROM schools
       WHERE id = :id
       LIMIT 1`,
      { id }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'School updated successfully',
      data: mapSchoolRow(updated[0]),
    });
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw httpError(DUPLICATE_MESSAGE, 409, [
        { field: 'name', message: DUPLICATE_MESSAGE },
        { field: 'ward', message: DUPLICATE_MESSAGE },
        { field: 'medium', message: DUPLICATE_MESSAGE },
      ]);
    }
    throw error;
  } finally {
    connection.release();
  }
});

export const deleteAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [current] = await connection.query(
      `SELECT id, name, ward, medium
       FROM schools
       WHERE id = :id AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { id }
    );

    if (!current.length) {
      throw httpError('School not found', 404);
    }

    const [linked] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE school_id = :id`,
      { id }
    );

    const linkedCount = Number(linked[0]?.total || 0);

    if (linkedCount > 0) {
      await connection.query(
        `UPDATE schools
         SET is_active = 0
         WHERE id = :id`,
        { id }
      );
      await connection.commit();

      return res.json({
        success: true,
        message:
          'School deactivated because students are linked to it. It will no longer appear in signup.',
        data: { id, deactivated: true },
      });
    }

    await connection.query(`DELETE FROM schools WHERE id = :id`, { id });
    await connection.commit();

    return res.json({
      success: true,
      message: 'School deleted successfully',
      data: { id, deleted: true },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const downloadSchoolImportTemplate = asyncHandler(async (req, res) => {
  const { format } = req.validated.query;
  const file = await buildSchoolImportTemplate(format);

  res.set({
    'Content-Type': file.contentType,
    'Content-Length': file.buffer.length,
    'Content-Disposition': `attachment; filename="${file.filename}"`,
    'Cache-Control': 'no-store',
  });
  res.send(file.buffer);
});

export const importAdminSchools = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw httpError('Upload file is required', 400, [
      { field: 'file', message: 'Upload an .xlsx or .csv file' },
    ]);
  }

  const { valid, invalid } = await parseSchoolImportFile(req.file);

  if (!valid.length && invalid.length) {
    throw httpError('No valid school rows found in the file', 400, [
      { field: 'file', message: 'Fix the row errors and upload again' },
      ...invalid.slice(0, 20).map((item) => ({
        field: `row.${item.rowNumber}`,
        message: `Row ${item.rowNumber}: ${item.message}`,
      })),
    ]);
  }

  if (!valid.length) {
    throw httpError('No school rows to import', 400, [
      { field: 'file', message: 'Add at least one school row' },
    ]);
  }

  const result = await importSchools(valid);

  res.json({
    success: true,
    message: `Import finished: ${result.created} created, ${result.restored} restored, ${result.skippedExisting} already existed, ${invalid.length} invalid rows skipped.`,
    data: {
      created: result.created,
      restored: result.restored,
      skippedExisting: result.skippedExisting,
      invalidCount: invalid.length,
      importedCount: valid.length,
      errors: invalid.slice(0, 50).map((item) => ({
        row: item.rowNumber,
        message: item.message,
      })),
    },
  });
});
