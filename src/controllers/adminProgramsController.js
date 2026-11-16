import pool from '../config/db.js';
import {
  releaseProgramSlug,
  requireActiveProgramByRef,
  resolveAdminProgramSlug,
} from '../services/programLookup.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assertValidScheduleWindow,
  buildSchedulePayload,
  toMysqlEndOfDayUtc,
  toMysqlStartOfDayUtc,
} from '../utils/programSchedule.js';
import { buildPagination, escapeLike } from '../utils/sql.js';

const PROGRAM_COLUMNS = `id, slug, heading_en, heading_hi, heading_mr, starts_at, ends_at, is_active, created_at, updated_at`;

function mapProgram(row) {
  if (!row) return null;
  const schedule = buildSchedulePayload(row.starts_at, row.ends_at);
  return {
    id: row.id,
    slug: row.slug,
    headingEn: row.heading_en,
    headingHi: row.heading_hi,
    headingMr: row.heading_mr,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    startsOn: schedule.startsOn,
    endsOn: schedule.endsOn,
    scheduleStatus: schedule.scheduleStatus,
    isOpen: schedule.isOpen,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseScheduleBody(body) {
  const startsAt = toMysqlStartOfDayUtc(body.startsAt, 'startsAt');
  const endsAt = toMysqlEndOfDayUtc(body.endsAt, 'endsAt');
  assertValidScheduleWindow(startsAt, endsAt);
  return { startsAt, endsAt };
}

export const listAdminPrograms = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.validated.query;
  const like = `%${escapeLike(search)}%`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM programs
     WHERE is_active = 1
       AND (
         :search = ''
         OR heading_en LIKE :like ESCAPE '\\\\'
         OR heading_hi LIKE :like ESCAPE '\\\\'
         OR heading_mr LIKE :like ESCAPE '\\\\'
         OR slug LIKE :like ESCAPE '\\\\'
       )`,
    { search, like }
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({ page, limit, total });

  const [rows] = await pool.query(
    `SELECT ${PROGRAM_COLUMNS}
     FROM programs
     WHERE is_active = 1
       AND (
         :search = ''
         OR heading_en LIKE :like ESCAPE '\\\\'
         OR heading_hi LIKE :like ESCAPE '\\\\'
         OR heading_mr LIKE :like ESCAPE '\\\\'
         OR slug LIKE :like ESCAPE '\\\\'
       )
     ORDER BY updated_at DESC, id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    { search, like }
  );

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: rows.map(mapProgram),
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

export const getAdminProgram = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const program = await requireActiveProgramByRef(id);

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: mapProgram(program),
  });
});

export const createAdminProgram = asyncHandler(async (req, res) => {
  const { headingEn, headingHi, headingMr, slug: slugInput } = req.validated.body;
  const { startsAt, endsAt } = parseScheduleBody(req.validated.body);
  const slug = await resolveAdminProgramSlug({
    slugInput,
    headingEn,
  });

  const [result] = await pool.query(
    `INSERT INTO programs (
       slug, heading_en, heading_hi, heading_mr, starts_at, ends_at, is_active
     ) VALUES (
       :slug, :headingEn, :headingHi, :headingMr, :startsAt, :endsAt, 1
     )`,
    { slug, headingEn, headingHi, headingMr, startsAt, endsAt }
  );

  const [rows] = await pool.query(
    `SELECT ${PROGRAM_COLUMNS}
     FROM programs
     WHERE id = :id
     LIMIT 1`,
    { id: result.insertId }
  );

  res.status(201).json({
    success: true,
    message: 'Program created successfully',
    data: mapProgram(rows[0]),
  });
});

export const updateAdminProgram = asyncHandler(async (req, res) => {
  const { id: programRef } = req.validated.params;
  const { headingEn, headingHi, headingMr, slug: slugInput } = req.validated.body;
  const { startsAt, endsAt } = parseScheduleBody(req.validated.body);
  const current = await requireActiveProgramByRef(programRef);

  const slug = await resolveAdminProgramSlug({
    slugInput: slugInput || current.slug,
    headingEn,
    excludeId: current.id,
  });

  await pool.query(
    `UPDATE programs
     SET slug = :slug,
         heading_en = :headingEn,
         heading_hi = :headingHi,
         heading_mr = :headingMr,
         starts_at = :startsAt,
         ends_at = :endsAt
     WHERE id = :id AND is_active = 1`,
    { id: current.id, slug, headingEn, headingHi, headingMr, startsAt, endsAt }
  );

  const [rows] = await pool.query(
    `SELECT ${PROGRAM_COLUMNS}
     FROM programs
     WHERE id = :id
     LIMIT 1`,
    { id: current.id }
  );

  res.json({
    success: true,
    message: 'Program updated successfully',
    data: mapProgram(rows[0]),
  });
});

export const deleteAdminProgram = asyncHandler(async (req, res) => {
  const { id: programRef } = req.validated.params;
  const current = await requireActiveProgramByRef(programRef);
  const id = current.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE program_sections
       SET is_active = 0
       WHERE program_id = :id AND is_active = 1`,
      { id }
    );

    await connection.query(
      `UPDATE program_questions q
       INNER JOIN program_sections s ON s.id = q.section_id
       SET q.is_active = 0
       WHERE s.program_id = :id AND q.is_active = 1`,
      { id }
    );

    await connection.query(
      `UPDATE programs
       SET is_active = 0
       WHERE id = :id`,
      { id }
    );

    await releaseProgramSlug(id, { connection });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.json({
    success: true,
    message: 'Program deleted successfully',
    data: { id, slug: current.slug, deleted: true },
  });
});
