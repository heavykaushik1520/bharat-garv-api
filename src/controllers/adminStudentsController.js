import pool from '../config/db.js';
import { streamStudentExport } from '../services/studentExportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { buildPagination, escapeLike } from '../utils/sql.js';

const STUDENT_SELECT = `
  u.id,
  u.email,
  u.phone,
  u.first_name,
  u.last_name,
  u.school_id,
  s.name AS school_name,
  u.standard,
  u.division,
  u.roll_number,
  u.preferred_language,
  u.is_active,
  u.created_at,
  u.updated_at
`;

function mapStudent(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    phoneDisplay: `+91${row.phone}`,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    schoolId: row.school_id,
    schoolName: row.school_name,
    standard: row.standard,
    division: row.division,
    rollNumber: row.roll_number,
    preferredLanguage: row.preferred_language,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildStudentFilters(query, { includeStatus = true } = {}) {
  const { search, schoolId, standard, preferredLanguage, status } = query;
  const like = `%${escapeLike(search || '')}%`;
  const phoneDigits = String(search || '').replace(/\D/g, '');

  const where = ['1=1'];
  const params = {
    search: search || '',
    like,
    phoneDigits: phoneDigits || null,
    schoolId: schoolId || null,
    standard: standard || null,
    preferredLanguage: preferredLanguage || null,
  };

  if (search) {
    where.push(`(
      u.first_name LIKE :like ESCAPE '\\\\'
      OR u.last_name LIKE :like ESCAPE '\\\\'
      OR CONCAT(u.first_name, ' ', u.last_name) LIKE :like ESCAPE '\\\\'
      OR u.email LIKE :like ESCAPE '\\\\'
      OR u.roll_number LIKE :like ESCAPE '\\\\'
      OR u.phone LIKE :like ESCAPE '\\\\'
      OR (:phoneDigits IS NOT NULL AND u.phone LIKE CONCAT('%', :phoneDigits, '%'))
      OR s.name LIKE :like ESCAPE '\\\\'
    )`);
  }

  if (schoolId) {
    where.push('u.school_id = :schoolId');
  }

  if (standard) {
    where.push('u.standard = :standard');
  }

  if (preferredLanguage) {
    where.push('u.preferred_language = :preferredLanguage');
  }

  if (includeStatus) {
    if (status === 'active') {
      where.push('u.is_active = 1');
    } else if (status === 'inactive') {
      where.push('u.is_active = 0');
    }
  }

  return { whereSql: where.join(' AND '), params };
}

function sortClause(sort) {
  switch (sort) {
    case 'oldest':
      return 'u.created_at ASC, u.id ASC';
    case 'name_asc':
      return 'u.first_name ASC, u.last_name ASC, u.id ASC';
    case 'name_desc':
      return 'u.first_name DESC, u.last_name DESC, u.id DESC';
    case 'newest':
    default:
      return 'u.created_at DESC, u.id DESC';
  }
}

/** GET ALL — searchable, filterable, paginated student list */
export const listAdminStudents = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { whereSql, params } = buildStudentFilters(query);
  const summaryFilters = buildStudentFilters(query, { includeStatus: false });
  const orderBy = sortClause(query.sort);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE ${whereSql}`,
    params
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({
    page: query.page,
    limit: query.limit,
    total,
  });

  const [rows] = await pool.query(
    `SELECT ${STUDENT_SELECT}
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params
  );

  const [summaryRows] = await pool.query(
    `SELECT
       SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) AS active_count,
       SUM(CASE WHEN u.is_active = 0 THEN 1 ELSE 0 END) AS inactive_count
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE ${summaryFilters.whereSql}`,
    summaryFilters.params
  );

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: rows.map(mapStudent),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
    summary: {
      active: Number(summaryRows[0]?.active_count || 0),
      inactive: Number(summaryRows[0]?.inactive_count || 0),
    },
  });
});

/** GET — CSV / Excel export of filtered students (streamed, password-safe) */
export const exportAdminStudents = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { whereSql, params } = buildStudentFilters(query);
  const orderBy = sortClause(query.sort);

  await streamStudentExport({
    req,
    res,
    format: query.format,
    whereSql,
    params,
    orderBy,
    query,
  });
});

/** GET — single student by id (never returns passwords) */
export const getAdminStudent = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [rows] = await pool.query(
    `SELECT ${STUDENT_SELECT}
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.id = :id
     LIMIT 1`,
    { id }
  );

  if (!rows.length) {
    throw httpError('Student not found', 404);
  }

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: mapStudent(rows[0]),
  });
});

/** Useful admin action: activate / deactivate without deleting history */
export const updateAdminStudentStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { isActive } = req.validated.body;

  const [current] = await pool.query(
    `SELECT id, is_active
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  if (!current.length) {
    throw httpError('Student not found', 404);
  }

  await pool.query(
    `UPDATE users
     SET is_active = :isActive
     WHERE id = :id`,
    { id, isActive: isActive ? 1 : 0 }
  );

  const [rows] = await pool.query(
    `SELECT ${STUDENT_SELECT}
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.id = :id
     LIMIT 1`,
    { id }
  );

  res.json({
    success: true,
    message: isActive ? 'Student activated successfully' : 'Student deactivated successfully',
    data: mapStudent(rows[0]),
  });
});
